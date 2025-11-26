#!/bin/bash

################################################################################
# S3 Media Manager - Utility to manage media files in AWS S3 bucket
# Features: List, Delete, Generate HTML gallery with preview server
# Uses credentials from .env file
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
GALLERY_DIR="$SCRIPT_DIR/s3-gallery"
GALLERY_HTML="$GALLERY_DIR/index.html"

################################################################################
# Functions
################################################################################

# Print banner
banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   S3 Media Manager v1.0                ║"
    echo "║   AWS S3 Bucket Media Management       ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Load environment variables from .env
load_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}✗ Error: .env file not found at $ENV_FILE${NC}"
        exit 1
    fi
    
    # Load .env variables
    export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)
    
    # Validate required variables
    if [ -z "$AWS_S3_BUCKET_NAME" ] || [ -z "$AWS_REGION" ] || [ -z "$AWS_S3_FOLDER" ]; then
        echo -e "${RED}✗ Error: Missing required AWS variables in .env${NC}"
        exit 1
    fi
    
    # Set AWS credentials
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_DEFAULT_REGION="$AWS_REGION"
}

# Check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}✗ AWS CLI not found. Please install it first:${NC}"
        echo "  pip install awscli"
        exit 1
    fi
}

# List all media files in bucket
list_media() {
    echo -e "${CYAN}📋 Listing media files in s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/${NC}\n"
    
    local count=0
    local total_size=0
    
    aws s3 ls "s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/" --recursive | while read -r line; do
        if [ ! -z "$line" ]; then
            count=$((count + 1))
            size=$(echo "$line" | awk '{print $3}')
            filename=$(echo "$line" | awk '{print $4}')
            
            total_size=$((total_size + size))
            
            # Format size
            if [ $size -lt 1024 ]; then
                size_fmt="${size}B"
            elif [ $size -lt 1048576 ]; then
                size_fmt="$(( size / 1024 ))KB"
            elif [ $size -lt 1073741824 ]; then
                size_fmt="$(( size / 1048576 ))MB"
            else
                size_fmt="$(( size / 1073741824 ))GB"
            fi
            
            echo -e "${GREEN}✓${NC} $filename (${size_fmt})"
        fi
    done
    
    # Get count differently since we can't capture in while loop
    local file_count=$(aws s3 ls "s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/" --recursive | wc -l)
    
    if [ $file_count -eq 0 ]; then
        echo -e "${YELLOW}⚠ No media files found${NC}"
    else
        echo -e "\n${CYAN}Total: $file_count file(s)${NC}"
    fi
}

# Delete a single media file
delete_single() {
    echo -e "${CYAN}🗑️  Delete a media file${NC}\n"
    
    # List files with numbers
    echo -e "${YELLOW}Available files:${NC}"
    local files=($(aws s3 ls "s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/" --recursive --query 'Contents[].Key' --output text))
    
    if [ ${#files[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ No files found${NC}"
        return
    fi
    
    for i in "${!files[@]}"; do
        echo "  $((i+1))) ${files[$i]##*/}"
    done
    
    echo -n -e "\n${CYAN}Select file number to delete (0 to cancel): ${NC}"
    read -r choice
    
    if [ "$choice" -eq 0 ] 2>/dev/null; then
        echo -e "${YELLOW}Cancelled${NC}"
        return
    fi
    
    if [ "$choice" -ge 1 ] && [ "$choice" -le ${#files[@]} ] 2>/dev/null; then
        local file_to_delete="${files[$((choice-1))]}"
        
        echo -n -e "${RED}Are you sure you want to delete '$file_to_delete'? (y/N): ${NC}"
        read -r confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            aws s3 rm "s3://$AWS_S3_BUCKET_NAME/$file_to_delete"
            echo -e "${GREEN}✓ File deleted successfully${NC}"
        else
            echo -e "${YELLOW}Cancelled${NC}"
        fi
    else
        echo -e "${RED}✗ Invalid selection${NC}"
    fi
}

# Delete all media files
delete_all() {
    echo -e "${CYAN}🗑️  Delete ALL media files${NC}\n"
    
    echo -n -e "${RED}⚠  WARNING: This will delete ALL files in s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/${NC}"
    echo -n -e "\n${RED}Are you ABSOLUTELY sure? Type 'DELETE' to confirm: ${NC}"
    read -r confirm
    
    if [ "$confirm" = "DELETE" ]; then
        echo -e "${YELLOW}Deleting all files...${NC}"
        aws s3 rm "s3://$AWS_S3_BUCKET_NAME/$AWS_S3_FOLDER/" --recursive
        echo -e "${GREEN}✓ All files deleted successfully${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Generate HTML gallery
generate_gallery() {
    echo -e "${CYAN}🖼️  Generating HTML gallery...${NC}\n"
    
    # Create gallery directory
    mkdir -p "$GALLERY_DIR"
    
    # Get list of files with sizes using list-objects-v2 (much faster)
    local files_json=$(aws s3api list-objects-v2 \
        --bucket "$AWS_S3_BUCKET_NAME" \
        --prefix "$AWS_S3_FOLDER/" \
        --query 'Contents[].{Key:Key,Size:Size}' \
        --output json 2>/dev/null || echo "[]")
    
    # Check if we have files
    local file_count=$(echo "$files_json" | grep -o '"Key"' | wc -l)
    
    if [ $file_count -eq 0 ]; then
        echo -e "${YELLOW}⚠ No files found to generate gallery${NC}"
        return
    fi
    
    # Build HTML gallery
    cat > "$GALLERY_HTML" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S3 Media Gallery</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .media-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .media-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
        
        .media-preview {
            width: 100%;
            height: 200px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }
        
        .media-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .media-preview video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .media-icon {
            font-size: 3em;
            opacity: 0.5;
        }
        
        .media-info {
            padding: 15px;
        }
        
        .media-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            word-break: break-word;
            font-size: 0.9em;
        }
        
        .media-size {
            font-size: 0.85em;
            color: #999;
            margin-bottom: 10px;
        }
        
        .media-actions {
            display: flex;
            gap: 8px;
        }
        
        .btn {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 6px;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        .btn-view {
            background: #667eea;
            color: white;
        }
        
        .btn-view:hover {
            background: #5568d3;
        }
        
        .btn-copy {
            background: #48bb78;
            color: white;
        }
        
        .btn-copy:hover {
            background: #38a169;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            color: white;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .modal-content {
            position: relative;
            margin: auto;
            padding: 0;
            width: 90%;
            max-width: 800px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .modal-media {
            width: 100%;
            max-height: 80vh;
            object-fit: contain;
            border-radius: 12px;
        }
        
        .modal-close {
            position: absolute;
            right: 20px;
            top: 20px;
            font-size: 2em;
            color: white;
            cursor: pointer;
            background: rgba(0,0,0,0.5);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .modal-close:hover {
            background: rgba(0,0,0,0.8);
        }
        
        .copy-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s;
            z-index: 2000;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖼️ S3 Media Gallery</h1>
            <p id="bucket-info"></p>
        </div>
        
        <div class="stats" id="stats"></div>
        
        <div class="gallery" id="gallery"></div>
        
        <div class="footer">
            <p>Generated at <span id="timestamp"></span></p>
        </div>
    </div>
    
    <div id="modal" class="modal">
        <div class="modal-content">
            <span class="modal-close" onclick="closeModal()">&times;</span>
            <div id="modal-body"></div>
        </div>
    </div>
    
    <script>
        // Data injected by script
        const BUCKET_NAME = '${BUCKET_NAME}';
        const REGION = '${REGION}';
        const FOLDER = '${FOLDER}';
        const BASE_URL = 'https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com';
        const MEDIA_FILES = ${JSON_FILES};
        
        // Initialize gallery
        function init() {
            updateBucketInfo();
            generateGallery();
            updateStats();
            updateTimestamp();
        }
        
        function updateBucketInfo() {
            document.getElementById('bucket-info').textContent = 
                `Bucket: ${BUCKET_NAME} • Folder: ${FOLDER} • Region: ${REGION}`;
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        function getMediaType(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
            const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
            
            if (imageExts.includes(ext)) return 'image';
            if (videoExts.includes(ext)) return 'video';
            return 'file';
        }
        
        function getMediaIcon(type) {
            switch(type) {
                case 'image': return '🖼️';
                case 'video': return '🎥';
                default: return '📄';
            }
        }
        
        function generateGallery() {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '';
            
            MEDIA_FILES.forEach(file => {
                const url = BASE_URL + '/' + file.key;
                const type = getMediaType(file.name);
                const icon = getMediaIcon(type);
                
                const card = document.createElement('div');
                card.className = 'media-card';
                
                let previewHTML = '';
                if (type === 'image') {
                    previewHTML = `<img src="${url}" alt="${file.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EImage Error%3C/text%3E%3C/svg%3E'">`;
                } else if (type === 'video') {
                    previewHTML = `<video><source src="${url}"></video>`;
                } else {
                    previewHTML = `<div class="media-icon">${icon}</div>`;
                }
                
                card.innerHTML = `
                    <div class="media-preview" onclick="openModal('${url}', '${type}')">
                        ${previewHTML}
                    </div>
                    <div class="media-info">
                        <div class="media-name" title="${file.name}">${file.name}</div>
                        <div class="media-size">${formatBytes(file.size)}</div>
                        <div class="media-actions">
                            <a href="${url}" target="_blank" class="btn btn-view">View</a>
                            <button class="btn btn-copy" onclick="copyUrl('${url}')">Copy</button>
                        </div>
                    </div>
                `;
                
                gallery.appendChild(card);
            });
        }
        
        function updateStats() {
            const stats = document.getElementById('stats');
            const totalSize = MEDIA_FILES.reduce((sum, file) => sum + file.size, 0);
            
            stats.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${MEDIA_FILES.length}</div>
                    <div class="stat-label">Total Files</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatBytes(totalSize)}</div>
                    <div class="stat-label">Total Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMediaStats().images}</div>
                    <div class="stat-label">Images</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getMediaStats().videos}</div>
                    <div class="stat-label">Videos</div>
                </div>
            `;
        }
        
        function getMediaStats() {
            let images = 0, videos = 0;
            MEDIA_FILES.forEach(file => {
                if (getMediaType(file.name) === 'image') images++;
                else if (getMediaType(file.name) === 'video') videos++;
            });
            return { images, videos };
        }
        
        function updateTimestamp() {
            const now = new Date();
            document.getElementById('timestamp').textContent = now.toLocaleString();
        }
        
        function openModal(url, type) {
            const modal = document.getElementById('modal');
            const body = document.getElementById('modal-body');
            
            if (type === 'image') {
                body.innerHTML = `<img src="${url}" class="modal-media" alt="Media">`;
            } else if (type === 'video') {
                body.innerHTML = `<video controls class="modal-media"><source src="${url}"></video>`;
            }
            
            modal.style.display = 'block';
        }
        
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
        
        window.onclick = function(event) {
            const modal = document.getElementById('modal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
        
        function copyUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                const notification = document.createElement('div');
                notification.className = 'copy-notification';
                notification.textContent = '✓ URL copied to clipboard';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            });
        }
        
        // Initialize on load
        window.addEventListener('load', init);
    </script>
</body>
</html>
EOF
    
    # Build JSON files array from the list-objects response
    # Using pure bash to avoid jq dependency
    local json_files="["
    local first=true
    
    echo "$files_json" | grep -o '"Key":"[^"]*","Size":[0-9]*' | while IFS= read -r line; do
        # Extract key and size
        local key=$(echo "$line" | sed 's/.*"Key":"\([^"]*\)".*/\1/')
        local size=$(echo "$line" | sed 's/.*"Size":\([0-9]*\).*/\1/')
        local name="${key##*/}"
        
        if [ "$first" = false ]; then
            json_files+=","
        fi
        json_files+="{\"key\":\"$key\",\"name\":\"$name\",\"size\":$size}"
        first=false
    done
    
    json_files+="]"
    
    # Replace placeholders
    sed -i "s|\${BUCKET_NAME}|$AWS_S3_BUCKET_NAME|g" "$GALLERY_HTML"
    sed -i "s|\${REGION}|$AWS_REGION|g" "$GALLERY_HTML"
    sed -i "s|\${FOLDER}|$AWS_S3_FOLDER|g" "$GALLERY_HTML"
    sed -i "s|\${JSON_FILES}|$json_files|g" "$GALLERY_HTML"
    
    echo -e "${GREEN}✓ Gallery generated: $GALLERY_HTML${NC}"
    echo -e "${CYAN}Total files: $file_count${NC}"
}

# Start simple HTTP server
start_server() {
    if [ ! -f "$GALLERY_HTML" ]; then
        echo -e "${YELLOW}Gallery not found. Generating...${NC}\n"
        generate_gallery
    fi
    
    local port=${1:-3003}
    
    echo -e "${CYAN}🚀 Starting web server...${NC}\n"
    echo -e "${GREEN}✓ Gallery URL: ${YELLOW}http://localhost:$port${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop${NC}\n"
    
    cd "$GALLERY_DIR"
    python3 -m http.server $port
}

# Show help
show_help() {
    cat << EOF
${CYAN}S3 Media Manager${NC}

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    list              List all media files in bucket
    delete-one        Delete a single media file interactively
    delete-all        Delete ALL media files (requires confirmation)
    gallery           Generate HTML gallery
    serve [PORT]      Start HTTP server to view gallery (default: 3003)
    help              Show this help message

EXAMPLES:
    $0 list                    # List all files
    $0 delete-one             # Delete a file interactively
    $0 gallery                # Generate gallery
    $0 serve 3003             # Start server on port 3003
    $0 serve                  # Start server on port 3003

EOF
}

################################################################################
# Main
################################################################################

main() {
    banner
    load_env
    check_aws_cli
    
    case "${1:-help}" in
        list)
            list_media
            ;;
        delete-one)
            delete_single
            ;;
        delete-all)
            delete_all
            ;;
        gallery)
            generate_gallery
            ;;
        serve)
            start_server "${2:-3003}"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}\n"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

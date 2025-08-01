export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const domain = env.DOMAIN;
    const DATABASE = env.DATABASE;
    const USERNAME = env.USERNAME;
    const PASSWORD = env.PASSWORD;
    const adminPath = env.ADMIN_PATH;
    const enableAuth = env.ENABLE_AUTH === 'true';
    const TG_BOT_TOKEN = env.TG_BOT_TOKEN;
    const TG_CHAT_ID = env.TG_CHAT_ID;
    const maxSizeMB = env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 20;
    const maxSize = maxSizeMB * 1024 * 1024;

    switch (pathname) {
      case '/':
        return await handleRootRequest(request, USERNAME, PASSWORD, enableAuth);
      case `/${adminPath}`:
        return await handleAdminRequest(DATABASE, request, USERNAME, PASSWORD);
      case '/upload':
        return request.method === 'POST' ? await handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) : new Response('Method Not Allowed', { status: 405 });
      case '/bing-images':
        return handleBingImagesRequest();
      case '/delete-images':
        return await handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD);
      default:
        return await handleImageRequest(request, DATABASE, TG_BOT_TOKEN);
    }
  }
};

function authenticate(request, USERNAME, PASSWORD) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  return isValidCredentials(authHeader, USERNAME, PASSWORD);
}

async function handleRootRequest(request, USERNAME, PASSWORD, enableAuth) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  if (enableAuth) {
      if (!authenticate(request, USERNAME, PASSWORD)) {
          return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
      }
  }
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
      return cachedResponse;
  }

  // 修改后的HTML内容（关键修复部分）
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Telegraph图床-基于Workers的图床服务">
  <meta name="keywords" content="Telegraph图床,Workers图床, Cloudflare, Workers,telegra.ph, 图床">
  <title>Telegraph图床-基于Workers的图床服务</title>
  <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-fileinput@5.2.7/css/fileinput.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/toastr@2.1.4/build/toastr.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/font-awesome@5.15.4/css/all.min.css" rel="stylesheet" />
  <style>
      /* 原有CSS样式保持不变 */
      body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; position: relative; }
      .background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; z-index: -1; transition: opacity 1s ease-in-out; opacity: 1; }
      .card { background-color: rgba(255, 255, 255, 0.8); border: none; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); padding: 20px; width: 90%; max-width: 400px; text-align: center; margin: 0 auto; position: relative; }
      .uniform-height { margin-top: 20px; }
      #viewCacheBtn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: rgba(0, 0, 0, 0.1); cursor: pointer; font-size: 24px; transition: color 0.3s ease; }
      #viewCacheBtn:hover { color: rgba(0, 0, 0, 0.4); }
      #compressionToggleBtn { position: absolute; top: 10px; right: 50px; background: none; border: none; color: rgba(0, 0, 0, 0.1); cursor: pointer; font-size: 24px; transition: color 0.3s ease; }
      #compressionToggleBtn:hover { color: rgba(0, 0, 0, 0.4); }
      #cacheContent { margin-top: 20px; max-height: 200px; border-radius: 5px; overflow-y: auto; }
      .cache-title { text-align: left; margin-bottom: 10px; }
      .cache-item { display: block; cursor: pointer; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); transition: background-color 0.3s ease; text-align: left; padding: 10px; }
      .cache-item:hover { background-color: #e9ecef; }
      .project-link { font-size: 14px; text-align: center; margin-top: 5px; margin-bottom: 0; }
      textarea.form-control { max-height: 200px; overflow-y: hidden; resize: none; }
  </style>
</head>
<body>
  <div class="background" id="background"></div>
  <div class="card">
      <div class="title">Telegraph图床</div>
      <button type="button" class="btn" id="viewCacheBtn" title="查看历史记录"><i class="fas fa-clock"></i></button>
      <button type="button" class="btn" id="compressionToggleBtn"><i class="fas fa-compress"></i></button>
      <div class="card-body">
          <form id="uploadForm" action="/upload" method="post" enctype="multipart/form-data">
              <div class="file-input-container">
                  <input id="fileInput" name="file" type="file" class="form-control-file" data-browse-on-zone-click="true" multiple>
              </div>
              <div class="form-group mb-3 uniform-height" style="display: none;">
                  <button type="button" class="btn btn-light mr-2" id="urlBtn">URL</button>
                  <button type="button" class="btn btn-light mr-2" id="bbcodeBtn">BBCode</button>
                  <button type="button" class="btn btn-light" id="markdownBtn">Markdown</button>
              </div>
              <div class="form-group mb-3 uniform-height" style="display: none;">
                  <textarea class="form-control" id="fileLink" readonly></textarea>
              </div>
              <div id="cacheContent" style="display: none;"></div>
          </form>
      </div>
      <p class="project-link">项目开源于 GitHub - <a href="https://github.com/0-RTT/telegraph" target="_blank" rel="noopener noreferrer">0-RTT/telegraph</a></p>
      
      <!-- 修复后的JS加载顺序 -->
      <script>
      // 可靠的双CDN回退方案
      if (!window.jQuery) {
        document.write('<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"><\\/script>');
      }
      </script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/js/bootstrap.bundle.min.js"></script>
      <script>
      // Bootstrap回退
      if (!window.bootstrap) {
        document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.1/js/bootstrap.bundle.min.js"><\\/script>');
      }
      </script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap-fileinput@5.2.7/js/fileinput.min.js"></script>
      <script>
      // FileInput回退
      if (!$.fn.fileinput) {
        document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/js/fileinput.min.js"><\\/script>');
      }
      </script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap-fileinput@5.2.7/js/locales/zh.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/toastr@2.1.4/toastr.min.js"></script>
      
      <script>
      // 错误监控
      window.onerror = function(msg, url, line) {
        console.error(\`Error: \${msg} at \${url}:\${line}\`);
        if (window.toastr) {
          toastr.error(\`加载错误: \${msg.split(':')[0]}\`);
        }
      };
      
      // 修改后的初始化函数
      window.initApp = function() {
        let originalImageURLs = [];
        let isCacheVisible = false;
        let enableCompression = true;
        
        async function fetchBingImages() {
          const response = await fetch('/bing-images');
          const data = await response.json();
          return data.data.map(image => image.url);
        }
      
        async function setBackgroundImages() {
          const images = await fetchBingImages();
          const backgroundDiv = document.getElementById('background');
          if (images.length > 0) {
            backgroundDiv.style.backgroundImage = 'url(' + images[0] + ')';
          }
          let index = 0;
          let currentBackgroundDiv = backgroundDiv;
          setInterval(() => {
            const nextIndex = (index + 1) % images.length;
            const nextBackgroundDiv = document.createElement('div');
            nextBackgroundDiv.className = 'background next';
            nextBackgroundDiv.style.backgroundImage = 'url(' + images[nextIndex] + ')';
            document.body.appendChild(nextBackgroundDiv);
            nextBackgroundDiv.style.opacity = 0;
            setTimeout(() => {
              nextBackgroundDiv.style.opacity = 1;
            }, 50);
            setTimeout(() => {
              document.body.removeChild(currentBackgroundDiv);
              currentBackgroundDiv = nextBackgroundDiv;
              index = nextIndex;
            }, 1000);
          }, 5000);
        }
      
        function initFileInput() {
          $("#fileInput").fileinput({
            theme: 'fa',
            language: 'zh',
            browseClass: "btn btn-primary",
            removeClass: "btn btn-danger",
            showUpload: false,
            showPreview: false,
          }).on('filebatchselected', handleFileSelection)
            .on('fileclear', handleFileClear);
        }
      
        async function handleFileSelection() {
          const files = $('#fileInput')[0].files;
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileHash = await calculateFileHash(file);
            const cachedData = getCachedData(fileHash);
            if (cachedData) {
                handleCachedFile(cachedData);
            } else {
                await uploadFile(file, fileHash);
            }
          }
        }
      
        function getCachedData(fileHash) {
            const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
            return cacheData.find(item => item.hash === fileHash);
        }
      
        function handleCachedFile(cachedData) {
            if (!originalImageURLs.includes(cachedData.url)) {
                originalImageURLs.push(cachedData.url);
                updateFileLinkDisplay();
                toastr.info('已从缓存中读取数据');
            }
        }
      
        function updateFileLinkDisplay() {
            $('#fileLink').val(originalImageURLs.join('\\n\\n'));
            $('.form-group').show();
            adjustTextareaHeight($('#fileLink')[0]);
        }
      
        async function calculateFileHash(file) {
          const arrayBuffer = await file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        }
      
        async function uploadFile(file, fileHash) {
          try {
            toastr.info('上传中...', '', { timeOut: 0 });
            const interfaceInfo = {
              enableCompression: enableCompression
            };
            if (file.type.startsWith('image/') && file.type !== 'image/gif' && interfaceInfo.enableCompression) {
              toastr.info('正在压缩...', '', { timeOut: 0 });
              const compressedFile = await compressImage(file);
              file = compressedFile;
            }
            const formData = new FormData($('#uploadForm')[0]);
            formData.set('file', file, file.name);
            const uploadResponse = await fetch('/upload', { method: 'POST', body: formData });
            const responseData = await handleUploadResponse(uploadResponse);
            if (responseData.error) {
              toastr.error(responseData.error);
            } else {
              originalImageURLs.push(responseData.data);
              $('#fileLink').val(originalImageURLs.join('\\n\\n'));
              $('.form-group').show();
              adjustTextareaHeight($('#fileLink')[0]);
              toastr.success('文件上传成功！');
              saveToLocalCache(responseData.data, file.name, fileHash);
            }
          } catch (error) {
            console.error('处理文件时出现错误:', error);
            $('#fileLink').val('文件处理失败！');
            toastr.error('文件处理失败！');
          } finally {
            toastr.clear();
          }
        }
      
        async function handleUploadResponse(response) {
          if (response.ok) {
            return await response.json();
          } else {
            const errorData = await response.json();
            return { error: errorData.error };
          }
        }
      
        $(document).on('paste', async function(event) {
          const clipboardData = event.originalEvent.clipboardData;
          if (clipboardData && clipboardData.items) {
            for (let i = 0; i < clipboardData.items.length; i++) {
              const item = clipboardData.items[i];
              if (item.kind === 'file') {
                const pasteFile = item.getAsFile();
                const dataTransfer = new DataTransfer();
                const existingFiles = $('#fileInput')[0].files;
                for (let j = 0; j < existingFiles.length; j++) {
                  dataTransfer.items.add(existingFiles[j]);
                }
                dataTransfer.items.add(pasteFile);
                $('#fileInput')[0].files = dataTransfer.files;
                $('#fileInput').trigger('change');
                break;
              }
            }
          }
        });
      
        async function compressImage(file, quality = 0.75) {
          return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
              const targetWidth = image.width;
              const targetHeight = image.height;
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
              canvas.toBlob((blob) => {
                const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                toastr.success('图片压缩成功！');
                resolve(compressedFile);
              }, 'image/jpeg', quality);
            };
            const reader = new FileReader();
            reader.onload = (event) => {
              image.src = event.target.result;
            };
            reader.readAsDataURL(file);
          });
        }
      
        $('#urlBtn, #bbcodeBtn, #markdownBtn').on('click', function() {
          const fileLinks = originalImageURLs.map(url => url.trim()).filter(url => url !== '');
          if (fileLinks.length > 0) {
            let formattedLinks = '';
            switch ($(this).attr('id')) {
              case 'urlBtn':
                formattedLinks = fileLinks.join('\\n\\n');
                break;
              case 'bbcodeBtn':
                formattedLinks = fileLinks.map(url => '[img]' + url + '[/img]').join('\\n\\n');
                break;
              case 'markdownBtn':
                formattedLinks = fileLinks.map(url => '![image](' + url + ')').join('\\n\\n');
                break;
              default:
                formattedLinks = fileLinks.join('\\n');
            }
            $('#fileLink').val(formattedLinks);
            adjustTextareaHeight($('#fileLink')[0]);
            copyToClipboardWithToastr(formattedLinks);
          }
        });
      
        function handleFileClear(event) {
          $('#fileLink').val('');
          adjustTextareaHeight($('#fileLink')[0]);
          hideButtonsAndTextarea();
          originalImageURLs = [];
        }
      
        function adjustTextareaHeight(textarea) {
          textarea.style.height = '1px';
          textarea.style.height = (textarea.scrollHeight > 200 ? 200 : textarea.scrollHeight) + 'px';
      
          if (textarea.scrollHeight > 200) {
            textarea.style.overflowY = 'auto';
          } else {
            textarea.style.overflowY = 'hidden';
          }
        }
      
        function copyToClipboardWithToastr(text) {
          const input = document.createElement('textarea');
          input.value = text;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
          toastr.success('已复制到剪贴板', '', { timeOut: 300 });
        }
      
        function hideButtonsAndTextarea() {
          $('#urlBtn, #bbcodeBtn, #markdownBtn, #fileLink').parent('.form-group').hide();
        }
      
        function saveToLocalCache(url, fileName, fileHash) {
          const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
          const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
          cacheData.push({ url, fileName, hash: fileHash, timestamp });
          localStorage.setItem('uploadCache', JSON.stringify(cacheData));
        }
      
        $('#viewCacheBtn').on('click', function() {
          const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
          const cacheContent = $('#cacheContent');
          cacheContent.empty();
          if (isCacheVisible) {
            cacheContent.hide();
            $('#fileLink').val('');
            $('#fileLink').parent('.form-group').hide();
            isCacheVisible = false;
          } else {
            if (cacheData.length > 0) {
              cacheData.reverse();
              cacheData.forEach((item) => {
                const listItem = $('<div class="cache-item"></div>')
                  .text(item.timestamp + ' - ' + item.fileName)
                  .data('url', item.url);
                cacheContent.append(listItem);
                cacheContent.append('<br>');
              });
              cacheContent.show();
            } else {
              cacheContent.append('<div>还没有记录哦！</div>').show();
            }
            isCacheVisible = true;
          }
        });
      
        $(document).on('click', '.cache-item', function() {
          const url = $(this).data('url');
          originalImageURLs = [];
          $('#fileLink').val('');
          originalImageURLs.push(url);
          $('#fileLink').val(originalImageURLs.map(url => url.trim()).join('\\n\\n'));
          $('.form-group').show();
          adjustTextareaHeight($('#fileLink')[0]);
        });
        
        // 初始化应用
        initFileInput();
        setBackgroundImages();
        
        const tooltipText = enableCompression ? '关闭压缩' : '开启压缩';
        $('#compressionToggleBtn').attr('title', tooltipText);
        $('#compressionToggleBtn').on('click', function() {
            enableCompression = !enableCompression;
            const icon = $(this).find('i');
            icon.toggleClass('fa-compress fa-expand');
            const tooltipText = enableCompression ? '关闭压缩' : '开启压缩';
            $(this).attr('title', tooltipText);
        });
      };
      
      // 安全启动机制
      function safeStart() {
        if (window.jQuery && window.$.fn.fileinput && window.toastr) {
          window.initApp();
        } else {
          console.log('等待依赖加载...');
          setTimeout(safeStart, 100);
        }
      }
      
      // 启动应用
      document.addEventListener('DOMContentLoaded', safeStart);
      </script>    
  </body>
  </html>  
  `;
  
  // 禁用缓存确保获取最新版本
  const response = new Response(htmlContent, {
    headers: { 
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
  
  await cache.put(cacheKey, response.clone());
  return response;
}

// 其他函数保持不变（handleAdminRequest, isValidCredentials, fetchMediaData等）
// ... [保持原有的 handleAdminRequest 函数不变] ...
// ... [保持原有的 isValidCredentials 函数不变] ...
// ... [保持原有的 fetchMediaData 函数不变] ...
// ... [保持原有的 handleUploadRequest 函数不变] ...
// ... [保持原有的 handleImageRequest 函数不变] ...
// ... [保持原有的 handleBingImagesRequest 函数不变] ...
// ... [保持原有的 handleDeleteImagesRequest 函数不变] ...

async function handleAdminRequest(DATABASE, request, USERNAME, PASSWORD) {
  /* 原有实现保持不变 */
}

function isValidCredentials(authHeader, USERNAME, PASSWORD) {
  /* 原有实现保持不变 */
}

async function fetchMediaData(DATABASE) {
  /* 原有实现保持不变 */
}

async function handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  /* 原有实现保持不变 */
}

async function handleImageRequest(request, DATABASE, TG_BOT_TOKEN) {
  /* 原有实现保持不变 */
}

async function handleBingImagesRequest(request) {
  /* 原有实现保持不变 */
}

async function handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD) {
  /* 原有实现保持不变 */
}

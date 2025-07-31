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
  const response = new Response(`
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Telegraph图床-基于Workers的图床服务">
  <meta name="keywords" content="Telegraph图床,Workers图床, Cloudflare, Workers,telegra.ph, 图床">
  <title>Telegraph图床-基于Workers的图床服务</title>
  <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
  <link href="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/twitter-bootstrap/4.6.1/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet" />
  <link href="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/bootstrap-fileinput/5.2.7/css/fileinput.min.css" rel="stylesheet" />
  <link href="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/toastr.js/2.1.4/toastr.min.css" rel="stylesheet" />
  <link href="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/font-awesome/5.15.4/css/all.min.css" type="text/css" rel="stylesheet" />
  <style>
      body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          position: relative;
      }
      .background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          z-index: -1;
          transition: opacity 1s ease-in-out;
          opacity: 1;
      }
      .card {
          background-color: rgba(255, 255, 255, 0.8);
          border: none;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          padding: 20px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          margin: 0 auto;
          position: relative;
      }
      .uniform-height {
          margin-top: 20px;
      }
      #viewCacheBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-size: 24px;
          transition: color 0.3s ease;
          z-index: 10;
      }
      #viewCacheBtn:hover {
          color: rgba(0, 0, 0, 0.4);
      }
      #compressionToggleBtn {
          position: absolute;
          top: 10px;
          right: 50px;
          background: none;
          border: none;
          color: rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-size: 24px;
          transition: color 0.3s ease;
          z-index: 10;
      }
      #compressionToggleBtn:hover {
          color: rgba(0, 0, 0, 0.4);
      }
      #cacheContent {
          margin-top: 20px;
          max-height: 200px;
          border-radius: 5px;
          overflow-y: auto;
      }
      .cache-title {
          text-align: left;
          margin-bottom: 10px;
      }
      .cache-item {
          display: block;
          cursor: pointer;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: background-color 0.3s ease;
          text-align: left;
          padding: 10px;
      }
      .cache-item:hover {
          background-color: #e9ecef;
      }
      .project-link {
          font-size: 14px;
          text-align: center;
          margin-top: 5px;
          margin-bottom: 0;
      }
      textarea.form-control {
          max-height: 200px;
          overflow-y: hidden;
          resize: none;
      }
      .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          color: white;
          font-size: 24px;
      }
  </style>
  <!-- 关键修改：确保jQuery最先加载 -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
  
  <!-- 其他依赖jQuery的库 -->
  <script src="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/bootstrap-fileinput/5.2.7/js/fileinput.min.js"></script>
  <script src="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/bootstrap-fileinput/5.2.7/js/locales/zh.min.js"></script>
  <script src="https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/toastr.js/2.1.4/toastr.min.js"></script>
</head>
<body>
  <div id="loadingOverlay" class="loading-overlay" style="display: none;">
      <div>加载中，请稍候...</div>
  </div>
  
  <div class="background" id="background"></div>
  <div class="card">
      <div class="title">Telegraph图床</div>
      <button type="button" class="btn" id="viewCacheBtn" title="查看历史记录"><i class="fas fa-clock"></i></button>
      <button type="button" class="btn" id="compressionToggleBtn" title="开启压缩"><i class="fas fa-compress"></i></button>
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
      
      <!-- 修改后的脚本部分 -->
      <script>
      // 显示加载状态
      document.getElementById('loadingOverlay').style.display = 'flex';
      
      // 等待所有资源加载完成
      window.addEventListener('load', function() {
          document.getElementById('loadingOverlay').style.display = 'none';
      });
      
      // 主初始化函数
      function initApp() {
          // 确保jQuery可用
          if (!window.jQuery) {
              // jQuery加载失败时的备用方案
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';
              script.integrity = 'sha512-894YE6QWD5I59HgZOGReFYm4dnWc1Qt5NtvYSaNcOP+u1T9qYdvdihz0PPSiiqn/+/3e7Jo4EaG7TubfWGUrMQ=';
              script.crossOrigin = 'anonymous';
              document.head.appendChild(script);
              
              // 再次尝试初始化
              setTimeout(initApp, 100);
              return;
          }
          
          $(function() {
              let originalImageURLs = [];
              let isCacheVisible = false;
              let enableCompression = true;
              
              // 初始化文件输入控件
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
              
              // 初始化背景图片
              async function setBackgroundImages() {
                  try {
                      const response = await fetch('/bing-images');
                      const data = await response.json();
                      const images = data.data.map(image => image.url);
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
                  } catch (error) {
                      console.error('加载背景图片失败:', error);
                  }
              }
              
              // 文件选择处理
              async function handleFileSelection() {
                  const files = $('#fileInput')[0].files;
                  for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      try {
                          const fileHash = await calculateFileHash(file);
                          const cachedData = getCachedData(fileHash);
                          
                          if (cachedData) {
                              handleCachedFile(cachedData);
                          } else {
                              await uploadFile(file, fileHash);
                          }
                      } catch (error) {
                          console.error('处理文件时出错:', error);
                          toastr.error('文件处理失败: ' + error.message);
                      }
                  }
              }
              
              // 计算文件哈希
              async function calculateFileHash(file) {
                  const arrayBuffer = await file.arrayBuffer();
                  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                  const hashArray = Array.from(new Uint8Array(hashBuffer));
                  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
              }
              
              // 获取缓存数据
              function getCachedData(fileHash) {
                  const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                  return cacheData.find(item => item.hash === fileHash);
              }
              
              // 处理缓存文件
              function handleCachedFile(cachedData) {
                  if (!originalImageURLs.includes(cachedData.url)) {
                      originalImageURLs.push(cachedData.url);
                      updateFileLinkDisplay();
                      toastr.info('已从缓存中读取数据');
                  }
              }
              
              // 更新文件链接显示
              function updateFileLinkDisplay() {
                  $('#fileLink').val(originalImageURLs.join('\\n\\n'));
                  $('.form-group').show();
                  adjustTextareaHeight($('#fileLink')[0]);
              }
              
              // 上传文件
              async function uploadFile(file, fileHash) {
                  try {
                      toastr.info('上传中...', '', { timeOut: 0 });
                      
                      const formData = new FormData($('#uploadForm')[0]);
                      formData.set('file', file, file.name);
                      
                      const uploadResponse = await fetch('/upload', { 
                          method: 'POST', 
                          body: formData 
                      });
                      
                      const responseData = await uploadResponse.json();
                      
                      if (responseData.error) {
                          toastr.error(responseData.error);
                      } else {
                          originalImageURLs.push(responseData.data);
                          updateFileLinkDisplay();
                          toastr.success('文件上传成功！');
                          saveToLocalCache(responseData.data, file.name, fileHash);
                      }
                  } catch (error) {
                      console.error('上传文件时出错:', error);
                      toastr.error('上传失败: ' + error.message);
                  } finally {
                      toastr.clear();
                  }
              }
              
              // 保存到本地缓存
              function saveToLocalCache(url, fileName, fileHash) {
                  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
                  const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                  
                  // 移除重复条目
                  const newCache = cacheData.filter(item => 
                      item.hash !== fileHash && item.url !== url
                  );
                  
                  // 添加新条目（最多保留50条）
                  newCache.unshift({ 
                      url, 
                      fileName, 
                      hash: fileHash, 
                      timestamp 
                  });
                  
                  localStorage.setItem('uploadCache', JSON.stringify(newCache.slice(0, 50)));
              }
              
              // 调整文本区域高度
              function adjustTextareaHeight(textarea) {
                  textarea.style.height = '1px';
                  textarea.style.height = (textarea.scrollHeight > 200 ? 200 : textarea.scrollHeight) + 'px';
                  
                  if (textarea.scrollHeight > 200) {
                      textarea.style.overflowY = 'auto';
                  } else {
                      textarea.style.overflowY = 'hidden';
                  }
              }
              
              // 初始化UI组件
              function initUI() {
                  // 压缩切换按钮
                  $('#compressionToggleBtn').attr('title', enableCompression ? '关闭压缩' : '开启压缩');
                  
                  // 修复压缩按钮点击事件
                  $('#compressionToggleBtn').on('click', function() {
                      enableCompression = !enableCompression;
                      const icon = $(this).find('i');
                      icon.toggleClass('fa-compress fa-expand');
                      
                      const tooltipText = enableCompression ? '关闭压缩' : '开启压缩';
                      $(this).attr('title', tooltipText);
                      toastr.info(enableCompression ? '已启用图片压缩' : '已禁用图片压缩');
                  });
                  
                  // 格式按钮
                  $('#urlBtn, #bbcodeBtn, #markdownBtn').on('click', function() {
                      const fileLinks = originalImageURLs.map(url => url.trim()).filter(url => url !== '');
                      
                      if (fileLinks.length === 0) return;
                      
                      let formattedLinks = '';
                      switch ($(this).attr('id')) {
                          case 'urlBtn':
                              formattedLinks = fileLinks.join('\\n\\n');
                              break;
                          case 'bbcodeBtn':
                              formattedLinks = fileLinks.map(url => '[img]' + url + '[/img]').join('\\n\\n');
                              break;
                          case 'markdownBtn':
                              formattedLinks = fileLinks.map(url => '![](' + url + ')').join('\\n\\n');
                              break;
                      }
                      
                      $('#fileLink').val(formattedLinks);
                      adjustTextareaHeight($('#fileLink')[0]);
                      copyToClipboardWithToastr(formattedLinks);
                  });
                  
                  // 缓存查看按钮
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
                  
                  // 缓存项点击处理
                  $(document).on('click', '.cache-item', function() {
                      const url = $(this).data('url');
                      originalImageURLs = [];
                      $('#fileLink').val('');
                      originalImageURLs.push(url);
                      $('#fileLink').val(originalImageURLs.map(url => url.trim()).join('\\n\\n'));
                      $('.form-group').show();
                      adjustTextareaHeight($('#fileLink')[0]);
                  });
                  
                  // 粘贴处理
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
              }
              
              // 复制到剪贴板
              function copyToClipboardWithToastr(text) {
                  const input = document.createElement('textarea');
                  input.value = text;
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand('copy');
                  document.body.removeChild(input);
                  toastr.success('已复制到剪贴板', '', { timeOut: 300 });
              }
              
              // 初始化应用
              initFileInput();
              setBackgroundImages();
              initUI();
          });
      }
      
      // 启动应用
      initApp();
      </script>    
  </div>
</body>
</html>  
`, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  await cache.put(cacheKey, response.clone());
  return response;
}

async function handleAdminRequest(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }
  return await generateAdminPage(DATABASE);
}

function isValidCredentials(authHeader, USERNAME, PASSWORD) {
  try {
    const base64Credentials = authHeader.split(' ')[1];
    if (!base64Credentials) return false;
    
    // 修复认证错误：使用正确的base64解码
    const credentials = atob(base64Credentials).split(':');
    const username = credentials[0];
    const password = credentials[1];
    
    return username === USERNAME && password === PASSWORD;
  } catch (e) {
    console.error('认证错误:', e);
    return false;
  }
}

async function generateAdminPage(DATABASE) {
  // 修复数据库错误：使用正确的数据库方法
  let mediaData = [];
  try {
    const result = await DATABASE.prepare('SELECT url, fileId FROM media').all();
    if (result && result.results) {
      mediaData = result.results.map(row => {
        const timestamp = parseInt(row.url.split('/').pop().split('.')[0]);
        return { fileId: row.fileId, url: row.url, timestamp: timestamp };
      });
      mediaData.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (e) {
    console.error('数据库查询错误:', e);
    return new Response('Database error', { status: 500 });
  }

  const mediaHtml = mediaData.map(({ url }) => {
    const fileExtension = url.split('.').pop().toLowerCase();
    const timestamp = url.split('/').pop().split('.')[0];
    const mediaType = fileExtension;
    let displayUrl = url;
    const supportedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
    const supportedVideoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    const isSupported = [...supportedImageExtensions, ...supportedVideoExtensions].includes(fileExtension);
    const backgroundStyle = isSupported ? '' : `style="font-size: 50px; display: flex; justify-content: center; align-items: center;"`;
    const icon = isSupported ? '' : '📁';
    return `
    <div class="media-container" data-key="${url}" onclick="toggleImageSelection(this)" ${backgroundStyle}>
      <div class="media-type">${mediaType}</div>
      ${supportedVideoExtensions.includes(fileExtension) ? `
        <video class="gallery-video" preload="none" style="width: 100%; height: 100%; object-fit: contain;" controls>
          <source data-src="${displayUrl}" type="video/${fileExtension}">
          您的浏览器不支持视频标签。
        </video>
      ` : `
        ${isSupported ? `<img class="gallery-image lazy" data-src="${displayUrl}" alt="Image">` : icon}
      `}
      <div class="upload-time">上传时间: ${new Date(parseInt(timestamp)).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>
    </div>
    `;
  }).join('');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>图库</title>
    <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
      }
      .header {
        position: sticky;
        top: 0;
        background-color: #ffffff;
        z-index: 1000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        flex-wrap: wrap;
      }
      .header-left {
        flex: 1;
      }
      .header-right {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex: 1;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }
      .media-container {
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        aspect-ratio: 1 / 1;
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .media-type {
        position: absolute;
        top: 10px;
        left: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 10;
        cursor: pointer;
      }
      .upload-time {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background-color: rgba(255, 255, 255, 0.7);
        padding: 5px;
        border-radius: 5px;
        color: #000;
        font-size: 14px;
        z-index: 10;
        display: none;
      }
      .media-container:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      .gallery-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: opacity 0.3s;
        opacity: 0;
      }
      .gallery-image.loaded {
        opacity: 1;
      }
      .media-container.selected {
        border: 2px solid #007bff;
        background-color: rgba(0, 123, 255, 0.1);
      }
      .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 18px;
        color: #555;
      }
      .delete-button, .copy-button {
        background-color: #ff4d4d;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 10px 15px;
        cursor: pointer;
        transition: background-color 0.3s;
        width: auto;
      }
      .delete-button:hover, .copy-button:hover {
        background-color: #ff1a1a;
      }
      .hidden {
        display: none;
      }
      .dropdown {
        position: relative;
        display: inline-block;
      }
      .dropdown-content {
        display: none;
        position: absolute;
        background-color: #f9f9f9;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        z-index: 1;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .dropdown-content button {
        color: black;
        padding: 12px 16px;
        text-decoration: none;
        display: block;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
      }
      .dropdown-content button:hover {
        background-color: #f1f1f1;
      }
      .dropdown:hover .dropdown-content {
        display: block;
      }
      @media (max-width: 768px) {
        .header-left, .header-right {
          flex: 1 1 100%;
          justify-content: flex-start;
        }
        .header-right {
          margin-top: 10px;
        }
        .gallery {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    </style>
    <script>
    let selectedCount = 0;
    const selectedKeys = new Set();
    let isAllSelected = false;
  
    function toggleImageSelection(container) {
      const key = container.getAttribute('data-key');
      container.classList.toggle('selected');
      const uploadTime = container.querySelector('.upload-time');
      if (container.classList.contains('selected')) {
        selectedKeys.add(key);
        selectedCount++;
        uploadTime.style.display = 'block';
      } else {
        selectedKeys.delete(key);
        selectedCount--;
        uploadTime.style.display = 'none';
      }
      updateDeleteButton();
    }
  
    function updateDeleteButton() {
      const deleteButton = document.getElementById('delete-button');
      const countDisplay = document.getElementById('selected-count');
      countDisplay.textContent = selectedCount;
      const headerRight = document.querySelector('.header-right');
      if (selectedCount > 0) {
        headerRight.classList.remove('hidden');
      } else {
        headerRight.classList.add('hidden');
      }
    }
  
    async function deleteSelectedImages() {
      if (selectedKeys.size === 0) return;
      const confirmation = confirm('你确定要删除选中的媒体文件吗？此操作无法撤回。');
      if (!confirmation) return;
  
      const response = await fetch('/delete-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Array.from(selectedKeys))
      });
      if (response.ok) {
        alert('选中的媒体已删除');
        location.reload();
      } else {
        alert('删除失败');
      }
    }
  
    function copyFormattedLinks(format) {
      const urls = Array.from(selectedKeys).map(url => url.trim()).filter(url => url !== '');
      let formattedLinks = '';
      switch (format) {
        case 'url':
          formattedLinks = urls.join('\\n\\n');
          break;
        case 'bbcode':
          formattedLinks = urls.map(url => '[img]' + url + '[/img]').join('\\n\\n');
          break;
        case 'markdown':
          formattedLinks = urls.map(url => '![image](' + url + ')').join('\\n\\n');
          break;
      }
      navigator.clipboard.writeText(formattedLinks).then(() => {
        alert('复制成功');
      }).catch((err) => {
        alert('复制失败');
      });
    }
  
    function selectAllImages() {
      const mediaContainers = document.querySelectorAll('.media-container');
      if (isAllSelected) {
        mediaContainers.forEach(container => {
          container.classList.remove('selected');
          const key = container.getAttribute('data-key');
          selectedKeys.delete(key);
          container.querySelector('.upload-time').style.display = 'none';
        });
        selectedCount = 0;
      } else {
        mediaContainers.forEach(container => {
          if (!container.classList.contains('selected')) {
            container.classList.add('selected');
            const key = container.getAttribute('data-key');
            selectedKeys.add(key);
            selectedCount++;
            container.querySelector('.upload-time').style.display = 'block';
          }
        });
      }
      isAllSelected = !isAllSelected;
      updateDeleteButton();
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      const mediaContainers = document.querySelectorAll('.media-container[data-key]');
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      };
      
      const mediaObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const container = entry.target;
            const video = container.querySelector('video');
            if (video) {
              const source = video.querySelector('source');
              video.src = source.getAttribute('data-src');
              video.load();
            } else {
              const img = container.querySelector('img');
              if (img && !img.src) {
                img.src = img.getAttribute('data-src');
                img.onload = () => img.classList.add('loaded');
              }
            }
            observer.unobserve(container);
          }
        });
      }, options);
  
      mediaContainers.forEach(container => {
        mediaObserver.observe(container);
      });
    });
  </script>
  </head>
  <body>
    <div class="header">
      <div class="header-left">
        <span>媒体文件 ${mediaData.length} 个</span>
        <span>已选中: <span id="selected-count">0</span>个</span>
      </div>
      <div class="header-right hidden">
        <div class="dropdown">
          <button class="copy-button">复制</button>
          <div class="dropdown-content">
            <button onclick="copyFormattedLinks('url')">URL</button>
            <button onclick="copyFormattedLinks('bbcode')">BBCode</button>
            <button onclick="copyFormattedLinks('markdown')">Markdown</button>
          </div>
        </div>
        <button id="select-all-button" class="delete-button" onclick="selectAllImages()">全选</button>
        <button id="delete-button" class="delete-button" onclick="deleteSelectedImages()">删除</button>
      </div>
    </div>
    <div class="gallery">
      ${mediaHtml}
    </div>
    <div class="footer">
      到底啦
    </div>
  </body>
  </html>  
  `;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function fetchMediaData(DATABASE) {
  const result = await DATABASE.prepare('SELECT url, fileId FROM media').all();
  return result.results || [];
}

async function handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('缺少文件');
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `文件大小超过${maxSize / (1024 * 1024)}MB限制` }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }
    if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
    }
    
    // 修复数据库错误：确保数据库操作正确
    let fileId;
    const uploadFormData = new FormData();
    uploadFormData.append("chat_id", TG_CHAT_ID);
    
    if (file.type.startsWith('image/gif')) {
      const newFileName = file.name.replace(/\.gif$/, '.jpeg');
      const newFile = new File([file], newFileName, { type: 'image/jpeg' });
      uploadFormData.append("document", newFile);
    } else {
      uploadFormData.append("document", file);
    }
    
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { 
      method: 'POST', 
      body: uploadFormData 
    });
    
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      throw new Error(errorData.description || '上传到 Telegram 失败');
    }
    
    const responseData = await telegramResponse.json();
    if (responseData.result.video) fileId = responseData.result.video.file_id;
    else if (responseData.result.document) fileId = responseData.result.document.file_id;
    else if (responseData.result.sticker) fileId = responseData.result.sticker.file_id;
    else throw new Error('返回的数据中没有文件 ID');
    
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const imageURL = `https://${domain}/${timestamp}.${fileExtension}`;
    
    // 修复数据库错误：确保数据库操作正确
    await DATABASE.prepare('INSERT INTO media (url, fileId) VALUES (?, ?) ON CONFLICT(url) DO NOTHING')
      .bind(imageURL, fileId)
      .run();
    
    return new Response(JSON.stringify({ data: imageURL }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('内部服务器错误:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

async function handleImageRequest(request, DATABASE, TG_BOT_TOKEN) {
  const requestedUrl = request.url;
  const cache = caches.default;
  const cacheKey = new Request(requestedUrl);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  
  // 修复数据库错误：确保数据库操作正确
  let fileId;
  try {
    const result = await DATABASE.prepare('SELECT fileId FROM media WHERE url = ?')
      .bind(requestedUrl)
      .first();
    
    if (!result) {
      const notFoundResponse = new Response('资源不存在', { status: 404 });
      await cache.put(cacheKey, notFoundResponse.clone());
      return notFoundResponse;
    }
    fileId = result.fileId;
  } catch (e) {
    console.error('数据库查询错误:', e);
    return new Response('Database error', { status: 500 });
  }
  
  let filePath;
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    const getFilePath = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (!getFilePath.ok) {
      return new Response('getFile请求失败', { status: 500 });
    }
    const fileData = await getFilePath.json();
    if (fileData.ok && fileData.result.file_path) {
      filePath = fileData.result.file_path;
      break;
    }
    attempts++;
  }
  
  if (!filePath) {
    const notFoundResponse = new Response('未找到FilePath', { status: 404 });
    await cache.put(cacheKey, notFoundResponse.clone());
    return notFoundResponse;
  }
  
  const getFileResponse = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;
  const response = await fetch(getFileResponse);
  if (!response.ok) {
    return new Response('获取文件内容失败', { status: 500 });
  }
  
  const fileExtension = requestedUrl.split('.').pop().toLowerCase();
  let contentType = 'text/plain';
  if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
  if (fileExtension === 'png') contentType = 'image/png';
  if (fileExtension === 'gif') contentType = 'image/gif';
  if (fileExtension === 'webp') contentType = 'image/webp';
  if (fileExtension === 'mp4') contentType = 'video/mp4';
  
  const headers = new Headers(response.headers);
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', 'inline');
  
  const responseToCache = new Response(response.body, { 
    status: response.status, 
    headers 
  });
  
  await cache.put(cacheKey, responseToCache.clone());
  return responseToCache;
}

async function handleBingImagesRequest() {
  const cache = caches.default;
  const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  
  const res = await fetch(cacheKey);
  if (!res.ok) {
    return new Response('请求 Bing API 失败', { status: res.status });
  }
  
  const bingData = await res.json();
  const images = bingData.images.map(image => ({ 
    url: `https://cn.bing.com${image.url}` 
  }));
  
  const returnData = { 
    status: true, 
    message: "操作成功", 
    data: images 
  };
  
  const response = new Response(JSON.stringify(returnData), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
  
  await cache.put(cacheKey, response.clone());
  return response;
}

async function handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  
  try {
    const keysToDelete = await request.json();
    if (!Array.isArray(keysToDelete) || keysToDelete.length === 0) {
      return new Response(JSON.stringify({ message: '没有要删除的项' }), { status: 400 });
    }
    
    // 修复数据库错误：确保数据库操作正确
    const placeholders = keysToDelete.map(() => '?').join(',');
    const result = await DATABASE.prepare(`DELETE FROM media WHERE url IN (${placeholders})`)
      .bind(...keysToDelete)
      .run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ message: '未找到要删除的项' }), { status: 404 });
    }
    
    const cache = caches.default;
    for (const url of keysToDelete) {
      const cacheKey = new Request(url);
      await cache.delete(cacheKey);
    }
    
    return new Response(JSON.stringify({ message: '删除成功' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: '删除失败', details: error.message }), { status: 500 });
  }
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

/**
 * HTML template for the upload UI
 */
function getHtmlContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPTX to PPTist Converter</title>
  <style>
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #22c55e;
      --error: #ef4444;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }

    .container {
      max-width: 600px;
      width: 100%;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 8px;
      text-align: center;
    }

    .subtitle {
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 32px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .dropzone {
      border: 2px dashed var(--border);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .dropzone:hover,
    .dropzone.dragover {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.1);
    }

    .dropzone-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .dropzone-text {
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .dropzone-hint {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .file-input {
      display: none;
    }

    .file-info {
      display: none;
      padding: 12px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 8px;
      margin-top: 12px;
      align-items: center;
      gap: 12px;
    }

    .file-info.show {
      display: flex;
    }

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remove-file {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      font-size: 1.25rem;
    }

    .format-section {
      margin-top: 20px;
    }

    .format-label {
      font-weight: 600;
      margin-bottom: 12px;
      display: block;
    }

    .format-options {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .format-option {
      flex: 1;
      min-width: 120px;
    }

    .format-option input {
      display: none;
    }

    .format-option label {
      display: block;
      padding: 12px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }

    .format-option input:checked + label {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.2);
    }

    .format-option label:hover {
      border-color: var(--primary);
    }

    .format-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .submit-btn {
      width: 100%;
      padding: 14px 24px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 24px;
    }

    .submit-btn:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .progress {
      display: none;
      margin-top: 20px;
    }

    .progress.show {
      display: block;
    }

    .progress-bar {
      height: 8px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary);
      width: 0%;
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: center;
      margin-top: 8px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .result {
      display: none;
      margin-top: 20px;
    }

    .result.show {
      display: block;
    }

    .result.success {
      border-left: 4px solid var(--success);
    }

    .result.error {
      border-left: 4px solid var(--error);
    }

    .result-content {
      padding: 16px;
      background: var(--card-bg);
      border-radius: 0 8px 8px 0;
    }

    .result-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .result-message {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .download-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .download-btn {
      flex: 1;
      min-width: 140px;
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      text-align: center;
    }

    .download-btn:hover {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.1);
    }

    .download-btn.json {
      border-color: var(--success);
    }

    .download-btn.pptist {
      border-color: var(--primary);
    }

    .error-message {
      color: var(--error);
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      h1 {
        font-size: 1.5rem;
      }

      .format-options {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PPTX Converter</h1>
    <p class="subtitle">Convert PowerPoint files to PPTist format</p>

    <form id="uploadForm">
      <div class="card">
        <div class="dropzone" id="dropzone">
          <div class="dropzone-icon">📄</div>
          <div class="dropzone-text">Drop PPTX file here or click to browse</div>
          <div class="dropzone-hint">Supports .pptx files up to 50MB</div>
          <input type="file" id="fileInput" class="file-input" accept=".pptx" />
        </div>
        <div class="file-info" id="fileInfo">
          <span class="file-name" id="fileName"></span>
          <button type="button" class="remove-file" id="removeFile">&times;</button>
        </div>

        <div class="format-section">
          <span class="format-label">Output Format</span>
          <div class="format-options">
            <div class="format-option">
              <input type="radio" id="formatPptist" name="format" value="pptist" checked />
              <label for="formatPptist">
                PPTist
                <div class="format-desc">Encrypted format</div>
              </label>
            </div>
            <div class="format-option">
              <input type="radio" id="formatJson" name="format" value="json" />
              <label for="formatJson">
                JSON
                <div class="format-desc">Raw JSON data</div>
              </label>
            </div>
            <div class="format-option">
              <input type="radio" id="formatBoth" name="format" value="both" />
              <label for="formatBoth">
                Both
                <div class="format-desc">Combined output</div>
              </label>
            </div>
          </div>
        </div>

        <button type="submit" class="submit-btn" id="submitBtn" disabled>
          Convert File
        </button>
      </div>
    </form>

    <div class="progress" id="progress">
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">Uploading...</div>
    </div>

    <div class="result" id="result">
      <div class="result-content">
        <div class="result-title" id="resultTitle"></div>
        <div class="result-message" id="resultMessage"></div>
        <div class="download-buttons" id="downloadButtons"></div>
      </div>
    </div>
  </div>

  <script>
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const result = document.getElementById('result');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const downloadButtons = document.getElementById('downloadButtons');

    let selectedFile = null;
    let responseData = null;

    // Dropzone click to open file dialog
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop handlers
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Remove file
    removeFile.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      fileInfo.classList.remove('show');
      submitBtn.disabled = true;
      hideResult();
    });

    function handleFileSelect(file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'pptx') {
        showError('Invalid File', 'Please select a .pptx file');
        return;
      }

      selectedFile = file;
      fileName.textContent = file.name;
      fileInfo.classList.add('show');
      submitBtn.disabled = false;
      hideResult();
    }

    // Form submit
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedFile) return;

      const format = document.querySelector('input[name="format"]:checked').value;
      await uploadFile(selectedFile, format);
    });

    async function uploadFile(file, format) {
      showProgress();
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span>Converting...';

      try {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = 'Uploading... ' + percent + '%';
          }
        });

        // Handle response
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              responseData = JSON.parse(xhr.responseText);
              showSuccess(format);
            } catch (err) {
              // Binary response (pptist format)
              downloadBinary(xhr.response, file.name.replace('.pptx', '.pptist'));
              showSuccessSingle('PPTist file downloaded');
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              showError('Conversion Failed', error.error?.message || 'Unknown error');
            } catch {
              showError('Conversion Failed', 'Server returned an error');
            }
          }
          resetForm();
        });

        xhr.addEventListener('error', () => {
          showError('Network Error', 'Failed to connect to server');
          resetForm();
        });

        xhr.open('POST', '/api/v1/convert?format=' + format);

        if (format === 'pptist') {
          xhr.responseType = 'blob';
        }

        xhr.send(formData);

      } catch (error) {
        showError('Upload Failed', error.message);
        resetForm();
      }
    }

    function downloadBinary(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function showProgress() {
      progress.classList.add('show');
      progressFill.style.width = '0%';
      progressText.textContent = 'Uploading...';
    }

    function hideProgress() {
      progress.classList.remove('show');
    }

    function showSuccess(format) {
      hideProgress();
      result.className = 'result show success';
      resultTitle.textContent = 'Conversion Complete';
      resultTitle.classList.remove('error-message');

      const baseName = selectedFile.name.replace('.pptx', '');

      if (format === 'both' && responseData) {
        resultMessage.textContent = 'Your file has been converted. Download in your preferred format.';
        downloadButtons.innerHTML =
          '<a class="download-btn json" download="' + baseName + '.json" href="data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(responseData.json, null, 2)) + '">Download JSON</a>' +
          '<a class="download-btn pptist" download="' + baseName + '.pptist" href="data:application/octet-stream;charset=utf-8,' + encodeURIComponent(responseData.pptist) + '">Download PPTist</a>';
      } else if (format === 'json' && responseData) {
        resultMessage.textContent = 'Your JSON file is ready for download.';
        downloadButtons.innerHTML =
          '<a class="download-btn json" download="' + baseName + '.json" href="data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(responseData, null, 2)) + '">Download JSON</a>';
      } else {
        resultMessage.textContent = 'PPTist file has been downloaded.';
        downloadButtons.innerHTML = '';
      }
    }

    function showSuccessSingle(message) {
      hideProgress();
      result.className = 'result show success';
      resultTitle.textContent = 'Conversion Complete';
      resultTitle.classList.remove('error-message');
      resultMessage.textContent = message;
      downloadButtons.innerHTML = '';
    }

    function showError(title, message) {
      hideProgress();
      result.className = 'result show error';
      resultTitle.textContent = title;
      resultTitle.classList.add('error-message');
      resultMessage.textContent = message;
      downloadButtons.innerHTML = '';
    }

    function hideResult() {
      result.className = 'result';
    }

    function resetForm() {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Convert File';
    }
  </script>
</body>
</html>`
}

/**
 * UI route options
 */
export interface UiOptions {
  route?: string
}

/**
 * Register UI routes
 */
export async function uiRoutes(
  fastify: FastifyInstance,
  options?: UiOptions
): Promise<void> {
  const route = options?.route ?? '/'

  fastify.get(route, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.type('text/html; charset=utf-8')
    return getHtmlContent()
  })
}

export default uiRoutes

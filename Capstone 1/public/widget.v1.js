/**
 * FlyRank Widget v1.0.0 - Embeddable Lead Capture Form
 * 
 * This script:
 * 1. Reads its own data-widget-id attribute
 * 2. Fetches widget configuration from the backend
 * 3. Renders a responsive form into a Shadow DOM (style isolation)
 * 4. Handles form submission with fetch API
 * 5. Shows success/error states
 * 
 * Usage: <script src="http://localhost:3000/static/widget.v1.js" data-widget-id="..."></script>
 * 
 * Cache-Control: public, max-age=31536000, immutable
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION & CONSTANTS
  // ============================================
  
  const WIDGET_VERSION = '1.0.0';
  const API_BASE = '/api'; // Relative to widget origin (same-origin) or full URL for cross-origin
  
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  /**
   * Gets the widget ID from the script tag's data-widget-id attribute.
   */
  function getWidgetId(): string | null {
    const scriptTag = document.currentScript as HTMLScriptElement | null;
    if (!scriptTag) {
      // Fallback: find script with data-widget-id
      const scripts = document.querySelectorAll('script[data-widget-id]');
      if (scripts.length > 0) {
        return scripts[scripts.length - 1].getAttribute('data-widget-id');
      }
      return null;
    }
    return scriptTag.getAttribute('data-widget-id');
  }

  /**
   * Creates a shadow root for style isolation.
   */
  function createShadowContainer(hostElement: HTMLElement): ShadowRoot {
    return hostElement.attachShadow({ mode: 'open' });
  }

  /**
   * Injects CSS into shadow root.
   */
  function injectStyles(shadowRoot: ShadowRoot): void {
    const style = document.createElement('style');
    style.textContent = `
      /* ============================================
         WIDGET BASE STYLES (isolated in Shadow DOM)
         ============================================ */
      
      :host {
        --widget-primary: #2563eb;
        --widget-primary-hover: #1d4ed8;
        --widget-error: #dc2626;
        --widget-success: #16a34a;
        --widget-bg: #ffffff;
        --widget-text: #1f2937;
        --widget-text-muted: #6b7280;
        --widget-border: #d1d5db;
        --widget-focus: #3b82f6;
        --widget-radius: 8px;
        --widget-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        display: block;
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
      }

      .widget-form {
        background: var(--widget-bg);
        border-radius: var(--widget-radius);
        box-shadow: var(--widget-shadow);
        padding: 24px;
      }

      .widget-title {
        margin: 0 0 8px 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--widget-text);
        line-height: 1.3;
      }

      .widget-description {
        margin: 0 0 24px 0;
        font-size: 0.95rem;
        color: var(--widget-text-muted);
        line-height: 1.5;
      }

      .widget-field-group {
        margin-bottom: 16px;
      }

      .widget-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--widget-text);
      }

      .widget-label .required::after {
        content: ' *';
        color: var(--widget-error);
      }

      .widget-input,
      .widget-textarea,
      .widget-select {
        width: 100%;
        padding: 10px 12px;
        font-size: 1rem;
        font-family: inherit;
        color: var(--widget-text);
        background: var(--widget-bg);
        border: 1px solid var(--widget-border);
        border-radius: 6px;
        box-sizing: border-box;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .widget-input:focus,
      .widget-textarea:focus,
      .widget-select:focus {
        outline: none;
        border-color: var(--widget-focus);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      }

      .widget-input::placeholder,
      .widget-textarea::placeholder {
        color: var(--widget-text-muted);
      }

      .widget-textarea {
        min-height: 100px;
        resize: vertical;
      }

      .widget-select {
        cursor: pointer;
      }

      .widget-submit {
        width: 100%;
        padding: 12px 24px;
        font-size: 1rem;
        font-weight: 600;
        font-family: inherit;
        color: #ffffff;
        background: var(--widget-primary);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.15s ease, transform 0.05s ease;
      }

      .widget-submit:hover {
        background: var(--widget-primary-hover);
      }

      .widget-submit:active {
        transform: scale(0.98);
      }

      .widget-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .widget-submit:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
      }

      .widget-message {
        margin-top: 16px;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 0.9rem;
        display: none;
      }

      .widget-message--success {
        display: block;
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .widget-message--error {
        display: block;
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      .widget-loading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .widget-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: widget-spin 0.8s linear infinite;
      }

      @keyframes widget-spin {
        to { transform: rotate(360deg); }
      }

      /* Honeypot field - hidden from users */
      .widget-honeypot {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }

      /* Responsive */
      @media (max-width: 480px) {
        :host {
          max-width: 100%;
        }
        .widget-form {
          padding: 16px;
          border-radius: 0;
          box-shadow: none;
        }
      }
    `;
    shadowRoot.appendChild(style);
  }

  /**
   * Builds the form HTML from configuration.
   */
  function buildFormHtml(config: any): string {
    const fieldsHtml = config.fields.map((field: any) => {
      const required = field.required ? ' required' : '';
      const requiredMark = field.required ? '<span class="required"></span>' : '';
      const id = `widget-field-${field.name}`;
      
      let inputHtml = '';
      switch (field.type) {
        case 'textarea':
          inputHtml = `<textarea class="widget-textarea" id="${id}" name="${field.name}"${required} placeholder="${field.label}"></textarea>`;
          break;
        case 'select':
          const optionsHtml = (field.options || []).map((opt: string) => 
            `<option value="${opt}">${opt}</option>`
          ).join('');
          inputHtml = `<select class="widget-select" id="${id}" name="${field.name}"${required}>${optionsHtml}</select>`;
          break;
        default:
          const type = field.type === 'email' ? 'email' : 'text';
          inputHtml = `<input type="${type}" class="widget-input" id="${id}" name="${field.name}"${required} placeholder="${field.label}">`;
      }
      
      return `
        <div class="widget-field-group">
          <label class="widget-label" for="${id}">${field.label}${requiredMark}</label>
          ${inputHtml}
        </div>
      `;
    }).join('');

    // Honeypot field (hidden from users, filled by bots)
    const honeypotHtml = `
      <div class="widget-field-group widget-honeypot" aria-hidden="true">
        <label for="widget-field-${config.honeypotFieldName}">Don't fill this</label>
        <input type="text" class="widget-input" id="widget-field-${config.honeypotFieldName}" name="${config.honeypotFieldName}" tabindex="-1" autocomplete="off">
      </div>
    `;

    return `
      <form class="widget-form" novalidate>
        <h2 class="widget-title">${config.title}</h2>
        ${fieldsHtml}
        ${honeypotHtml}
        <button type="submit" class="widget-submit">
          <span class="widget-btn-text">${config.buttonText}</span>
          <span class="widget-loading" style="display:none;">
            <span class="widget-spinner"></span>
            <span>Submitting...</span>
          </span>
        </button>
        <div class="widget-message" role="alert"></div>
      </form>
    `;
  }

  // ============================================
  // WIDGET CLASS
  // ============================================
  
  class Widget {
    private widgetId: string;
    private hostElement: HTMLElement;
    private shadowRoot: ShadowRoot;
    private config: any = null;
    private formElement: HTMLFormElement | null = null;

    constructor(widgetId: string) {
      this.widgetId = widgetId;
      
      // Create host element where widget will be mounted
      this.hostElement = document.createElement('div');
      this.hostElement.setAttribute('data-widget-host', widgetId);
      
      // Create shadow DOM for style isolation
      this.shadowRoot = createShadowContainer(this.hostElement);
      injectStyles(this.shadowRoot);
    }

    /**
     * Initializes the widget: fetches config, renders form, attaches to DOM.
     */
    async init(): Promise<void> {
      try {
        await this.fetchConfig();
        this.render();
        this.attachToDom();
        this.bindEvents();
      } catch (error) {
        this.showError('Failed to load widget. Please try again later.');
        console.error('[Widget] Initialization failed:', error);
      }
    }

    /**
     * Fetches widget configuration from the backend.
     */
    private async fetchConfig(): Promise<void> {
      // Determine API base URL
      // If widget is served from same origin, use relative path
      // If cross-origin, we need the full URL
      const scriptTag = document.currentScript as HTMLScriptElement | null;
      const scriptSrc = scriptTag?.src || '';
      const apiBase = scriptSrc.includes('://') 
        ? new URL(scriptSrc).origin + API_BASE
        : API_BASE;

      const response = await fetch(`${apiBase}/widgets/${this.widgetId}/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'omit', // No cookies for widget
      });

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
      // API returns { success: true, data: { id, name, type, config } }
      if (data.success && data.data?.config) {
        this.config = data.data.config;
      } else {
        throw new Error('Invalid config response');
      }
    }

    /**
     * Renders the form into the shadow DOM.
     */
    private render(): void {
      if (!this.config) return;
      
      this.shadowRoot.innerHTML = ''; // Clear styles will be re-injected
      injectStyles(this.shadowRoot);
      this.shadowRoot.innerHTML += buildFormHtml(this.config);
      
      this.formElement = this.shadowRoot.querySelector('form.widget-form');
    }

    /**
     * Attaches the widget to the DOM at the script tag location.
     */
    private attachToDom(): void {
      const scriptTag = document.currentScript as HTMLScriptElement | null;
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.insertBefore(this.hostElement, scriptTag.nextSibling);
      } else {
        // Fallback: append to body
        document.body.appendChild(this.hostElement);
      }
    }

    /**
     * Binds form submission event.
     */
    private bindEvents(): void {
      if (!this.formElement) return;

      this.formElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.handleSubmit();
      });
    }

    /**
     * Handles form submission.
     */
    private async handleSubmit(): Promise<void> {
      if (!this.formElement || !this.config) return;

      const submitBtn = this.formElement.querySelector('.widget-submit') as HTMLButtonElement;
      const btnText = this.formElement.querySelector('.widget-btn-text');
      const btnLoading = this.formElement.querySelector('.widget-loading');
      const messageEl = this.formElement.querySelector('.widget-message');

      // Disable button and show loading
      submitBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) (btnLoading as HTMLElement).style.display = 'inline-flex';
      this.hideMessage();

      // Collect form data
      const formData = new FormData(this.formElement);
      const payload: Record<string, any> = {};
      
      for (const [key, value] of formData.entries()) {
        // Skip honeypot field from payload (but it's sent for server-side detection)
        payload[key] = value;
      }

      try {
        // Determine submission endpoint
        const scriptTag = document.currentScript as HTMLScriptElement | null;
        const scriptSrc = scriptTag?.src || '';
        const apiBase = scriptSrc.includes('://') 
          ? new URL(scriptSrc).origin + API_BASE
          : API_BASE;

        const response = await fetch(`${apiBase}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Widget-Id': this.widgetId,
          },
          body: JSON.stringify(payload),
          credentials: 'omit',
        });

        const result = await response.json();

        if (response.ok && result.success) {
          this.showSuccess(this.getSuccessMessage());
          this.formElement!.reset();
        } else {
          const errorMsg = result.error?.message || 'Submission failed. Please try again.';
          this.showError(errorMsg);
        }
      } catch (error) {
        console.error('[Widget] Submission error:', error);
        this.showError('Network error. Please check your connection and try again.');
      } finally {
        // Re-enable button
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) (btnLoading as HTMLElement).style.display = 'none';
      }
    }

    /**
     * Gets success message from config or uses default.
     */
    private getSuccessMessage(): string {
      return this.config?.successMessage || 'Thank you! Your submission has been received.';
    }

    /**
     * Shows success message.
     */
    private showSuccess(message: string): void {
      const messageEl = this.formElement?.querySelector('.widget-message');
      if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = 'widget-message widget-message--success';
      }
    }

    /**
     * Shows error message.
     */
    private showError(message: string): void {
      const messageEl = this.formElement?.querySelector('.widget-message');
      if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = 'widget-message widget-message--error';
      }
    }

    /**
     * Hides message.
     */
    private hideMessage(): void {
      const messageEl = this.formElement?.querySelector('.widget-message');
      if (messageEl) {
        messageEl.className = 'widget-message';
      }
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  function initWidget(): void {
    const widgetId = getWidgetId();
    
    if (!widgetId) {
      console.error('[Widget] No data-widget-id attribute found on script tag');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(widgetId)) {
      console.error('[Widget] Invalid widget ID format:', widgetId);
      return;
    }

    const widget = new Widget(widgetId);
    widget.init().catch((error) => {
      console.error('[Widget] Fatal error:', error);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Expose for debugging
  (window as any).FlyRankWidget = { version: WIDGET_VERSION };
})();
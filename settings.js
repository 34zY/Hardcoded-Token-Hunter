// Settings.js - Settings Management

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Event listeners
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  document.getElementById('testWebhookBtn').addEventListener('click', testWebhook);
});

// Load saved settings
async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    if (settings) {
      document.getElementById('autoScanEnabled').checked = settings.autoScanEnabled || false;
      document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
      document.getElementById('discordWebhookEnabled').checked = settings.discordWebhookEnabled || false;
      document.getElementById('discordWebhookUrl').value = settings.discordWebhookUrl || '';
      document.getElementById('saveHistory').checked = settings.saveHistory !== false;
      document.getElementById('scanDelay').value = settings.scanDelay || 3000;
      document.getElementById('minTokenLength').value = settings.minTokenLength || 15;

      // Social media filter (active by default)
      document.getElementById('skipSocialMediaScan').checked = settings.skipSocialMediaScan !== false;

      // Proxy settings
      document.getElementById('proxyEnabled').checked = settings.proxyEnabled || false;
      document.getElementById('proxyHost').value = settings.proxyHost || '127.0.0.1';
      document.getElementById('proxyPort').value = settings.proxyPort || '8080';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
    const webhookEnabled = document.getElementById('discordWebhookEnabled').checked;

    // Validate webhook URL if active
    if (webhookEnabled && webhookUrl) {
      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
          !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        alert('⚠️ Invalid webhook URL!\n\nMust start with:\nhttps://discord.com/api/webhooks/\nor\nhttps://discordapp.com/api/webhooks/');
        return;
      }

      // Validate basic format
      const webhookParts = webhookUrl.split('/');
      if (webhookParts.length < 7) {
        alert('⚠️ Incomplete webhook URL!\n\nExpected format:\nhttps://discord.com/api/webhooks/[ID]/[TOKEN]');
        return;
      }
    }

    const settings = {
      autoScanEnabled: document.getElementById('autoScanEnabled').checked,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      discordWebhookEnabled: webhookEnabled,
      discordWebhookUrl: webhookUrl,
      saveHistory: document.getElementById('saveHistory').checked,
      scanDelay: parseInt(document.getElementById('scanDelay').value) || 3000,
      minTokenLength: parseInt(document.getElementById('minTokenLength').value) || 15,

      // Social media filter
      skipSocialMediaScan: document.getElementById('skipSocialMediaScan').checked,

      // Proxy settings
      proxyEnabled: document.getElementById('proxyEnabled').checked,
      proxyHost: document.getElementById('proxyHost').value.trim() || '127.0.0.1',
      proxyPort: parseInt(document.getElementById('proxyPort').value) || 8080
    };

    await chrome.storage.local.set({ settings });

    // Show success message
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);

    console.log('✅ Settings saved:', settings);
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
}

// Restore default settings
async function resetSettings() {
  if (!confirm('🔄 Are you sure you want to restore default settings?')) {
    return;
  }

  const defaultSettings = {
    autoScanEnabled: false,
    notificationsEnabled: true,
    discordWebhookEnabled: false,
    discordWebhookUrl: '',
    saveHistory: true,
    scanDelay: 3000,
    minTokenLength: 15,

    // Social media filter
    skipSocialMediaScan: true,

    // Proxy settings
    proxyEnabled: false,
    proxyHost: '127.0.0.1',
    proxyPort: 8080
  };

  try {
    await chrome.storage.local.set({ settings: defaultSettings });
    await loadSettings();

    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = '✅ Settings restored to default!';
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
      successMessage.textContent = '✅ Settings saved successfully!';
    }, 3000);

    console.log('✅ Settings restored to default');
  } catch (error) {
    console.error('❌ Error restoring settings:', error);
    alert('Error restoring settings: ' + error.message);
  }
}

// Test Discord webhook
async function testWebhook() {
  const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
  const statusDiv = document.getElementById('webhookStatus');

  if (!webhookUrl) {
    statusDiv.textContent = '⚠️ Please enter a webhook URL';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
    return;
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    statusDiv.textContent = '❌ Invalid URL! Must start with https://discord.com/api/webhooks/ or https://discordapp.com/api/webhooks/';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
    return;
  }

  // Show loading
  statusDiv.textContent = '⏳ Testing webhook...';
  statusDiv.className = 'webhook-status';
  statusDiv.style.background = '#e3f2fd';
  statusDiv.style.color = '#1976d2';
  statusDiv.style.border = '1px solid #2196f3';
  statusDiv.style.display = 'block';

  try {
    const testPayload = {
      username: 'OFJAAAH Token Detector',
      embeds: [{
        title: '🧪 Webhook Test',
        description: 'This is a test message from **Hardcoded Token Detector**!',
        color: 0x667EEA,
        fields: [
          {
            name: '✅ Status',
            value: 'Webhook configured correctly!',
            inline: true
          },
          {
            name: '🔧 Mode',
            value: 'Test',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'by OFJAAAH - https://ofjaaah.com'
        }
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      statusDiv.textContent = '✅ Webhook tested successfully! Check your Discord channel.';
      statusDiv.className = 'webhook-status success';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    } else {
      const errorText = await response.text();
      statusDiv.textContent = `❌ Erro ${response.status}: ${errorText || response.statusText}`;
      statusDiv.className = 'webhook-status error';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  } catch (error) {
    statusDiv.textContent = `❌ Error testing webhook: ${error.message}`;
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

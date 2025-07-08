const { contextBridge, ipcRenderer } = require('electron');

// كشف APIs آمنة للصفحة الرئيسية
contextBridge.exposeInMainWorld('electronAPI', {
    // حفظ الملفات
    saveFile: (content, defaultName) => ipcRenderer.invoke('save-file', content, defaultName),
    
    // معالجة الأحداث
    onExportResult: (callback) => ipcRenderer.on('export-result', callback),
    
    // معلومات التطبيق
    platform: process.platform,
    
    // وظائف التطبيق
    getVersion: () => '1.0.0',
    
    // إزالة المستمعين
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// دعم الوظائف الأساسية للنظام
contextBridge.exposeInMainWorld('systemAPI', {
    isElectron: true,
    platform: process.platform,
    version: process.versions
});
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    // إنشاء نافذة المتصفح
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'icon.png'), // يمكنك إضافة أيقونة لاحقاً
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        titleBarStyle: 'default'
    });

    // تحميل الملف الرئيسي
    mainWindow.loadFile('index_static.html');

    // إظهار النافذة عند الانتهاء من التحميل
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // التركيز على النافذة
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // فتح أدوات المطور في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // التعامل مع إغلاق النافذة
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // منع التنقل خارج التطبيق
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    // فتح الروابط الخارجية في المتصفح
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// إنشاء قائمة التطبيق
function createMenu() {
    const template = [
        {
            label: 'ملف',
            submenu: [
                {
                    label: 'تصدير النتيجة',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('export-result');
                    }
                },
                {
                    label: 'طباعة',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.print();
                    }
                },
                { type: 'separator' },
                {
                    label: 'خروج',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'تحرير',
            submenu: [
                { role: 'undo', label: 'تراجع' },
                { role: 'redo', label: 'إعادة' },
                { type: 'separator' },
                { role: 'cut', label: 'قص' },
                { role: 'copy', label: 'نسخ' },
                { role: 'paste', label: 'لصق' },
                { role: 'selectall', label: 'تحديد الكل' }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                { role: 'reload', label: 'إعادة تحميل' },
                { role: 'forceReload', label: 'إعادة تحميل قسرية' },
                { role: 'toggleDevTools', label: 'أدوات المطور' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'إعادة تعيين التكبير' },
                { role: 'zoomIn', label: 'تكبير' },
                { role: 'zoomOut', label: 'تصغير' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'ملء الشاشة' }
            ]
        },
        {
            label: 'نافذة',
            submenu: [
                { role: 'minimize', label: 'تصغير' },
                { role: 'close', label: 'إغلاق' }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                {
                    label: 'حول التطبيق',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'حول التطبيق',
                            message: 'مساعد طلبة الحقوق الذكي',
                            detail: 'تطبيق شامل لمساعدة طلبة الحقوق في الدراسة والبحث\n\nالإصدار: 1.0.0',
                            buttons: ['موافق']
                        });
                    }
                },
                {
                    label: 'كيفية الاستخدام',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'كيفية الاستخدام',
                            message: 'خطوات الاستخدام:',
                            detail: '1. احصل على مفتاح Gemini API من Google AI Studio\n2. أدخل المفتاح في الحقل المخصص واحفظه\n3. اختر نوع الخدمة المطلوبة\n4. املأ البيانات المطلوبة\n5. اضغط على إنشاء',
                            buttons: ['موافق']
                        });
                    }
                }
            ]
        }
    ];

    // تعديل القائمة لنظام macOS
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: `حول ${app.getName()}` },
                { type: 'separator' },
                { role: 'services', label: 'خدمات' },
                { type: 'separator' },
                { role: 'hide', label: `إخفاء ${app.getName()}` },
                { role: 'hideothers', label: 'إخفاء الآخرين' },
                { role: 'unhide', label: 'إظهار الكل' },
                { type: 'separator' },
                { role: 'quit', label: `خروج ${app.getName()}` }
            ]
        });

        // Window menu
        template[4].submenu = [
            { role: 'close', label: 'إغلاق' },
            { role: 'minimize', label: 'تصغير' },
            { role: 'zoom', label: 'تكبير' },
            { type: 'separator' },
            { role: 'front', label: 'إحضار الكل للمقدمة' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// معالجة حفظ الملفات
ipcMain.handle('save-file', async (event, content, defaultName) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultName,
            filters: [
                { name: 'مستندات Word', extensions: ['docx'] },
                { name: 'ملفات نصية', extensions: ['txt'] },
                { name: 'ملفات PDF', extensions: ['pdf'] },
                { name: 'جميع الملفات', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            fs.writeFileSync(result.filePath, content, 'utf8');
            return { success: true, path: result.filePath };
        }
        
        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// تهيئة التطبيق
app.whenReady().then(() => {
    createWindow();
    createMenu();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// إغلاق التطبيق عند إغلاق جميع النوافذ
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// منع التطبيق من الفتح أكثر من مرة
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// التأكد من تشغيل نسخة واحدة فقط
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
}
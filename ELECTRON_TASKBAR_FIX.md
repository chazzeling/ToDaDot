# Electron 작업표시줄 아이콘/이름 수정 가이드

## 문제
작업표시줄에 "electron"이라고 표시되고 아이콘이 변경되는 문제

## 해결 방법

### 1. 앱 이름 설정 (app.whenReady() 전에 호출)

```typescript
// electron/main.ts
import { app } from 'electron';

// 앱 이름 설정 (Windows 작업 표시줄에서 표시되는 이름)
app.setName('YourAppName');

// Windows에서 작업 표시줄 아이콘과 이름을 올바르게 표시하기 위한 설정
if (process.platform === 'win32') {
  // App User Model ID 설정 (Windows 작업 표시줄에서 앱을 식별하는 고유 ID)
  // package.json의 appId와 일치시켜야 함
  app.setAppUserModelId('com.yourapp.id');
}
```

### 2. BrowserWindow 설정

```typescript
mainWindow = new BrowserWindow({
  // ... 기타 설정
  title: 'YourAppName', // 창 제목 설정
  icon: iconPath, // 아이콘 경로
  webPreferences: {
    // ... 기타 설정
  },
});

// Windows에서 작업 표시줄 아이콘 강제 설정
if (process.platform === 'win32' && iconPath) {
  mainWindow.setIcon(iconPath);
}
```

### 3. package.json 설정

```json
{
  "name": "yourapp",
  "build": {
    "appId": "com.yourapp.id",
    "productName": "YourAppName",
    "win": {
      "executableName": "YourAppName",
      "icon": "icon.png"
    }
  }
}
```

## 중요 사항

1. **app.setName()**은 `app.whenReady()` 전에 호출해야 합니다.
2. **app.setAppUserModelId()**는 Windows에서만 필요하며, `package.json`의 `appId`와 일치해야 합니다.
3. **mainWindow.setIcon()**을 명시적으로 호출하여 아이콘을 강제 설정합니다.
4. 아이콘 파일은 `.ico` (Windows) 또는 `.png` (macOS/Linux) 형식이어야 합니다.

## 체크리스트

- [ ] `app.setName('YourAppName')` 호출 (app.whenReady() 전)
- [ ] Windows에서 `app.setAppUserModelId('com.yourapp.id')` 호출
- [ ] BrowserWindow에 `title` 설정
- [ ] BrowserWindow에 `icon` 설정
- [ ] Windows에서 `mainWindow.setIcon(iconPath)` 호출
- [ ] package.json의 `appId`와 `productName` 설정
- [ ] package.json의 `win.executableName` 설정


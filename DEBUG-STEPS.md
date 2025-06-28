# 🔧 Debugging Extension Not Opening

## Step-by-Step Troubleshooting

### 1. **First Test - Check if Extension is Loaded**
- Press `Ctrl+Shift+P` (Command Palette)
- Type: **"What-The-Code: Test Extension"**
- If you see "✅ Extension is working!" message, then extension is loaded ✅

### 2. **Check Developer Console for Logs**
- Press `Ctrl+Shift+I` (or `F12`) to open Developer Tools
- Go to **Console** tab
- Look for messages starting with:
  - `🚀 What-The-Code extension is now activating!`
  - `🔍 Search command triggered!`

### 3. **Test Keyboard Shortcut**
- Try `Ctrl+Shift+Alt+K`
- Check console for: `🔍 Search command triggered!`
- If no message appears, the shortcut isn't working

### 4. **Alternative Ways to Test**

#### Method A: Command Palette
- Press `Ctrl+Shift+P`
- Type: **"Ask Your Code"**
- Press Enter

#### Method B: Status Bar
- Look for **"🔍 Ask Code"** in bottom right
- Click it

### 5. **Check Extension Installation**
```bash
# In your workspace
code --list-extensions
# Should show: what-the-code (if packaged)
```

### 6. **Reload VS Code Window**
- Press `Ctrl+Shift+P`
- Type: **"Developer: Reload Window"**
- Try again after reload

### 7. **Check Extension Development Mode**
If you're in development mode:
- Press `F5` to launch Extension Development Host
- Test the extension in the new window

## Expected Behavior ✅

When working correctly, `Ctrl+Shift+Alt+K` should:
1. Show console log: `🔍 Search command triggered!`
2. Open a dialog with example queries like:
   - "React components that handle forms"
   - "CSS styles for buttons and layouts"
   - etc.

## If Still Not Working 🛠️

Try this manual test:
1. Press `Ctrl+Shift+P`
2. Type exactly: **"What-The-Code: Test Extension"**
3. If this works but keyboard shortcut doesn't, it's a keybinding issue
4. If neither works, the extension isn't loading properly

## Quick Fixes 🔧

### Fix 1: Reload Window
`Ctrl+Shift+P` → "Developer: Reload Window"

### Fix 2: Check Keybinding Conflicts
`File` → `Preferences` → `Keyboard Shortcuts` → Search: `ctrl+shift+alt+k`

### Fix 3: Use Command Palette Instead
`Ctrl+Shift+P` → "Ask Your Code"

Let me know what you see in the console! 🔍

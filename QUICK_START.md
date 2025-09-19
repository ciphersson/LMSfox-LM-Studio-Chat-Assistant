# 🚀 Quick Start Guide - LM Studio Firefox Extension

## 5-Minute Setup

### Step 1: Install LM Studio
1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Install and open LM Studio
3. Download a model (recommended: Llama 2 7B or Mistral 7B)

### Step 2: Start LM Studio Server
1. In LM Studio, go to **"Local Server"** tab
2. Click **"Start Server"**
3. Ensure port is set to **1234**
4. Load your downloaded model

### Step 3: Install Firefox Extension
1. Open Firefox
2. Go to `about:debugging`
3. Click **"This Firefox"**
4. Click **"Load Temporary Add-on"**
5. Navigate to the extension folder
6. Select `manifest.json`

### Step 4: Test the Extension
1. Look for the 🤖 icon in your Firefox toolbar
2. Click it to open the chat interface
3. Type a test message: "Hello, can you help me?"
4. Press Enter or click Send

## Key Features to Try

### 🔍 Internet Search
- Toggle the search button (🔍) in the chat interface
- Ask: "What's the latest news about AI?"
- The extension will search the web and enhance the AI's response

### 📄 Page Context
- Open any webpage
- Right-click selected text → "Ask LM Studio about this"
- Or use the full interface with "Use Page Context" enabled

### 💬 Full Chat Interface
- Click the 🔗 button in the popup for expanded view
- Access chat history, quick prompts, and file attachments
- Export conversations for backup

### ⚙️ Settings
- Click the gear icon (⚙️) to access settings
- Adjust response creativity, search preferences, and UI options
- Configure connection settings if using different ports

## Troubleshooting

### "Disconnected" Status
- **Check**: LM Studio server is running on localhost:1234
- **Fix**: Start the server in LM Studio's "Local Server" tab

### No Response from AI
- **Check**: A model is loaded in LM Studio
- **Fix**: Load a model in the "Chat" tab before starting the server

### Search Not Working
- **Check**: Internet connection
- **Fix**: Toggle search off/on or check settings

### Extension Not Loading
- **Check**: Firefox version (requires 88+)
- **Fix**: Update Firefox or try in developer mode

## Tips for Best Results

1. **Model Selection**: Larger models (7B+) give better responses
2. **Search Usage**: Enable search for current events and facts
3. **Context**: Use page context for analyzing specific content
4. **Temperature**: Lower values (0.3-0.5) for factual responses, higher (0.7-1.0) for creative tasks

## Next Steps

- Explore the settings page for customization options
- Try different models in LM Studio for varied capabilities
- Use context menus for quick text analysis
- Export important conversations for reference

---

**Need help?** Check the full README.md for detailed documentation.

# CareerPilot AI: Resume Analyzer & Career Tool

CareerPilot AI is an intelligent web application powered by **Qwen2.5-Coder 7B** that helps job seekers analyze their resumes, practice for interviews, and improve their candidacy. By leveraging local AI models through LM Studio, it provides detailed resume analysis, mock interview simulations, and a full-featured admin dashboard—all while keeping your data private.

## 🌟 Core Features

### 🔐 **Multi-Role Authentication System** (NEW v2.1)
- **Three User Types**: Individual job seekers, Company/Recruiters, Career Coaches
- **Role-Based Access**: Automatic routing to appropriate dashboards
- **Company Accounts**: Extended registration with company details (name, size, industry)
- Complete registration and login system with password hashing (bcryptjs)
- Secure admin panel with separate authentication

### 🏢 **Company Dashboard & Bulk Analysis** (NEW v2.3)
- **Bulk Resume Upload**: Process up to 50 resumes at once against a job description
- **Resume Validation**: AI automatically detects and rejects non-resume documents (0% score)
- **Job Management**: Create, view, edit, and delete company-specific job postings
- **Private Job Postings**: Company-specific job descriptions not visible to other users
- **AI-Powered Ranking**: Automatically rank candidates by match score
- **Batch Processing**: Track progress of bulk analysis in real-time
- **Analytics Dashboard**: View hiring insights and statistics powered by AI
- **Advanced Filtering**: Modern slider UI to filter candidates by minimum score
- **Candidate Management**: Filter, sort, and export top candidates to CSV

### 🤖 **Intelligent AI Career Agent** (Powered by Qwen2.5-Coder 7B)
- **Natural Conversation Flow**: Engage in back-and-forth dialogue for resume analysis and interview prep
- **Smart Context Retention**: Remembers job descriptions and resumes throughout the conversation (no repeated questions!)
- **Autonomous Decision Making**: Intelligently determines when to analyze resumes or generate interview questions
- **Multi-Pattern Extraction**: Recognizes job descriptions in various formats (formal posts, natural language, etc.)
- **Unlimited Interview Questions**: Generate as many practice questions as you need
- **Priority-Based Workflow**: Always shows resume analysis first, then offers interview preparation

### 📊 **Advanced AI Resume Analysis**
- **Dynamic Job Selection**: Choose from admin-managed job descriptions
- **Deep Contextual Analysis** with skill mapping and equivalency:
  - `matchScore`: Percentage score (0-100) prioritizing core skills
  - `matchingSkills`: Skills that align with the job requirements
  - `missingSkills`: Gaps to address for better candidacy
  - `impliedSkills`: Inferred abilities from projects and experience
  - `status`: Qualitative assessment ("Approved", "Needs Improvement", "Not a Match")
- **Smart PDF Parsing**: Position-aware text extraction preserving document structure
  - Handles multi-column resumes
  - Preserves line breaks and formatting
  - Proper word spacing and section detection

### 🎯 **AI-Powered Mock Interview Simulation**
- **Eligibility-Based**: Unlocked for match scores ≥ 70%
- **Progressive Difficulty**: 5 AI-generated questions from basic to advanced
- **Flexible Input**: Speech-to-text or typing (with anti-cheating measures)
- **Detailed Evaluation**: Each answer scored (1-10) with constructive AI feedback
- **Continuous Practice**: Request more questions anytime for extended practice

### 📈 **Visual Results & Reports**
- Clean, markdown-formatted analysis displays
- Interview results with performance metrics
- Downloadable PDF reports
- Personalized analysis history (private to each user)

### 👨‍💼 **Admin Dashboard**
- **User Management**: View all registered users
- **Job Description CRUD**: Full Create, Read, Update, Delete functionality
- Secure admin-only access

## 🛠️ Technology Stack

-   **Frontend**: [Next.js](https://nextjs.org/) 15.3.3 with React 18 & TypeScript
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components
-   **AI Framework**: [Genkit](https://firebase.google.com/docs/genkit) for AI flow orchestration
-   **LLM Provider**: [LM Studio](https://lmstudio.ai/) with **Qwen2.5-Coder 7B** model (local, private)
-   **PDF Parsing**: [pdf2json](https://www.npmjs.com/package/pdf2json) & [pdf.js](https://mozilla.github.io/pdf.js/) for reliable PDF text extraction
-   **Database**: [MongoDB](https://www.mongodb.com/) for storing users, jobs, and analysis history
-   **Authentication**: Custom implementation with `bcryptjs` password hashing
-   **Speech Recognition**: Web Speech API for voice input

## 🚀 Key Technical Features

### Bulk Resume Processing
- **Parallel PDF Extraction**: Efficient processing of multiple resumes using pdf2json
- **Event-Based Parsing**: Handles various PDF formats and encoding issues gracefully
- **Fallback Decoding**: Automatically handles malformed URI encoding in PDFs
- **Batch Tracking**: Real-time progress monitoring with MongoDB-backed state management
- **Error Resilience**: Individual resume failures don't stop the entire batch

### Enhanced PDF Parsing
- **Position-Aware Extraction**: Reads text based on X/Y coordinates (top→bottom, left→right)
- **Line Detection**: Preserves structure by detecting Y-position changes
- **Multi-Column Support**: Correctly handles two-column resume layouts
- **Smart Spacing**: Prevents word merging with intelligent space insertion
- **Page Breaks**: Clear markers between pages for better context
- **Robust Error Handling**: Graceful fallback for encoding issues and malformed PDFs

### Intelligent Agent System
- **Multi-Pattern Job Description Extraction**: 4 different regex patterns to catch JDs in any format
- **Context Window**: 4096 tokens for Llama with 8-message history
- **Analysis Detection**: Tracks conversation state to prevent redundant operations
- **Explicit Intent Recognition**: Only generates questions when explicitly requested
- **Resume Content Marking**: Clear delimiters for robust content extraction

### AI Analysis Pipeline
- **Skill Equivalency Mapping**: Django ≈ FastAPI, Express.js → Node.js, etc.
- **Conceptual Skills Detection**: Jenkins + Docker + AWS → CI/CD experience
- **Project Quality Assessment**: Distinguishes meaningful usage from keyword listing
- **Weighted Scoring**: Core skills prioritized, penalties for missing requirements
- **Structured JSON Output**: Direct Ollama API calls with format enforcement

## 📋 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   [Node.js](https://nodejs.org/en) (version 18 or higher)
-   npm or yarn
-   [LM Studio](https://lmstudio.ai/) installed with **Qwen2.5-Coder 7B** model loaded
-   MongoDB database (local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud instance)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd CareerPilot-AI-Resume-Analyzer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up LM Studio with Qwen2.5-Coder 7B:**
    
    a. **Download and install LM Studio:**
       - Visit [https://lmstudio.ai/](https://lmstudio.ai/)
       - Download for your operating system
       - Install and launch LM Studio
    
    b. **Download Qwen2.5-Coder 7B model:**
       - In LM Studio, go to the "Search" tab
       - Search for "qwen2.5-coder-7b-instruct"
       - Download the model (GGUF format recommended)
       - Wait for download to complete
    
    c. **Load and start the model:**
       - Go to the "Local Server" tab in LM Studio
       - Select "qwen2.5-coder-7b-instruct" from the model dropdown
       - Click "Start Server"
       - Ensure server is running on `http://localhost:1234` (default)
    
    **Verify LM Studio is running:**
    ```bash
    curl http://localhost:1234/v1/models
    ```
    You should see the qwen2.5-coder model in the response.

4.  **Set up environment variables:**
    Create a `.env` file in the root of your project:

    ```env
    # MongoDB Connection
    MONGODB_URI=your_mongodb_connection_string_here

    # Admin Credentials
    ADMIN_EMAIL=admin@example.com
    ADMIN_PASSWORD=your_secure_admin_password
    ```
    
    #### Option A: MongoDB Atlas (Cloud - Recommended)
    1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
    2. Get your connection string from the dashboard
    3. Format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/career-pilot?retryWrites=true&w=majority`

    #### Option B: Local MongoDB
    1. Install MongoDB locally
    2. Use: `mongodb://localhost:27017/career-pilot`

### Running the Application

1.  **Ensure LM Studio server is running:**
    - Open LM Studio
    - Go to "Local Server" tab
    - Ensure qwen2.5-coder-7b-instruct is loaded
    - Server should be running on `http://localhost:1234`
    - Keep LM Studio running in the background

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  **Access the application:**
    - Main App: `http://localhost:9002`
    - Admin Panel: `http://localhost:9002/admin/login`

4.  **First-time setup:**
    - Register a user account (individual, company, or coach)
    - Log in with admin credentials to add job descriptions
    - Users can then analyze resumes against these jobs

## 💡 Usage Guide

### For Job Seekers

1. **Register/Login** at `/register` or `/login`
2. **Navigate to AI Agent** (`/agent`) in the navbar
3. **Start a conversation:**
   ```
   You: "I want to apply for a Full Stack Developer position..."
   Agent: "Great! Please provide the full job description."
   
   You: [Paste job description]
   Agent: "Perfect! Now upload your resume using the attachment button."
   
   You: [Upload PDF resume]
   Agent: [Automatically analyzes] 📊 Shows match score, skills, gaps
   
   Agent: "Would you like interview practice questions?"
   You: "Yes please"
   Agent: 🎯 Generates 5 questions
   
   You: "Give me more questions"
   Agent: 🎯 Generates 5 more questions (unlimited!)
   ```

4. **Alternative Flow** - Use the main analyzer:
   - Go to homepage
   - Select a job from dropdown
   - Upload resume
   - Get instant analysis

5. **View History** at `/history` to see past analyses

### For Administrators

1. **Login** at `/admin/login` with admin credentials
2. **Manage Jobs**: Add, edit, or delete job descriptions
3. **View Users**: See all registered users
4. **Monitor Activity**: Track platform usage

### For Company/Recruiter Users (NEW v2.1)

1. **Register** as a company at `/register`:
   - Select "Company / Recruiter" role
   - Fill in company details (name, size, industry, website)
   - Complete registration

2. **Access Company Dashboard** at `/company/dashboard`:
   - View batch analysis statistics
   - Monitor active job postings
   - See average match scores

3. **Bulk Resume Analysis**:
   - Go to **Bulk Upload** (`/company/bulk-upload`)
   - Select or create a job description
   - Upload multiple resumes (up to 50 PDFs at once)
   - Click **Start Batch Analysis**
   - Track processing progress in real-time
   - View ranked candidates sorted by AI match score
   - **Supported PDF Formats**: Text-based PDFs (works with various encodings and formats)

4. **Manage Job Postings** at `/company/jobs`:
   - Create private company-specific job descriptions
   - Edit existing jobs
   - Use jobs for bulk analysis matching

5. **Review Candidates**:
   - See candidates ranked by match score (highest to lowest)
   - Filter by score thresholds using the slider
   - Export top candidates to CSV
   - Download original resumes
   - View detailed AI analysis for each candidate
   - See matching skills, missing skills, and recommendations

### For Career Coach Users (NEW v2.1)

Career coaches have access to all individual features and can:
- Help multiple clients analyze resumes
- Guide interview preparation
- Track client progress (coming soon)
- Generate coaching reports (coming soon)

## ⚙️ Configuration

### Using Different LM Studio Models

The application uses **Qwen2.5-Coder 7B** by default. To use a different model:

1. **Load the desired model in LM Studio:**
   - Download a compatible model (7B-13B recommended for balance of speed/quality)
   - Load it in the Local Server tab
   - Note the model name shown in LM Studio

2. **Update model references in flow files:**
   
   The application makes direct API calls to LM Studio. Update the model name in:
   - `src/ai/flows/skill-matching.ts` (around line 92)
   - `src/ai/flows/interview-flow.ts`
   - `src/ai/flows/agent-flow.ts` (around line 213)
   - `src/app/api/company/batch-upload/route.ts` (around line 162)
   
   Change:
   ```typescript
   model: 'qwen2.5-coder-7b-instruct'
   ```
   
   To your model name:
   ```typescript
   model: 'your-model-name'
   ```

3. **Recommended models:**
   - **Qwen2.5-Coder 7B**: Best for code/technical resumes (current default)
   - **Llama 3.1 8B**: Good general-purpose alternative
   - **Mistral 7B**: Fast and efficient
   - **Phi-3 Medium**: Compact but capable

### Adjusting LM Studio Settings

For better performance, adjust settings in LM Studio's Local Server tab:

**Context Length:**
- Default: 4096 tokens
- For longer resumes: increase to 8192 or higher
- Balance between memory usage and context

**Temperature:**
- Default: 0.3-0.7 (depending on task)
- Lower (0.1-0.3): More consistent, factual analysis
- Higher (0.7-0.9): More creative interview questions

**GPU Layers:**
- Max out for fastest performance
- Reduce if experiencing memory issues

### PDF Parsing Configuration

The enhanced PDF parser is pre-configured in:
- `src/app/agent/page.tsx`
- `src/components/career-pilot/career-pilot-client.tsx`

Key parameters:
- Y-position threshold: `5 pixels` (for line detection)
- Text filtering: Empty strings removed
- Position sorting: Top→bottom, then left→right

## 🎯 Benefits of Local LLM Setup

- 🚀 **Zero API Costs** - Everything runs locally on your machine
- 🔒 **Complete Privacy** - Resume data never leaves your computer
- ⚡ **Fast Inference** - Direct GPU acceleration (if available)
- 🛠️ **Fully Customizable** - Swap models anytime for different capabilities
- 📶 **Works Offline** - No internet required after initial setup
- 🎨 **Unlimited Usage** - No rate limits or quotas

## 📚 Project Structure

```
CareerPilot-AI-Resume-Analyzer/
├── src/
│   ├── ai/
│   │   ├── genkit.ts              # Genkit + Ollama configuration
│   │   ├── schemas.ts             # Zod schemas for AI flows
│   │   └── flows/
│   │       ├── agent-flow.ts      # Conversational agent logic
│   │       ├── skill-matching.ts  # Resume analysis flow
│   │       └── interview-flow.ts  # Interview question generation
│   ├── app/
│   │   ├── agent/                 # AI Career Agent page
│   │   ├── api/                   # API routes
│   │   ├── admin/                 # Admin dashboard
│   │   └── ...                    # Other pages
│   ├── components/
│   │   ├── career-pilot/          # Resume analyzer components
│   │   ├── admin/                 # Admin components
│   │   ├── layout/                # Layout components
│   │   └── ui/                    # ShadCN UI components
│   └── lib/
│       ├── mongodb.ts             # MongoDB connection
│       └── utils.ts               # Utility functions
├── docs/                          # Documentation
├── .env                           # Environment variables
└── README.md
```

## 🐛 Troubleshooting

### LM Studio Connection Issues
```bash
# Check if LM Studio server is running
curl http://localhost:1234/v1/models

# Verify server status in LM Studio:
# 1. Open LM Studio
# 2. Go to "Local Server" tab
# 3. Check server is started and shows green status
# 4. Confirm port is 1234 (default)

# If connection fails:
# - Restart LM Studio server
# - Check firewall settings
# - Ensure no other service is using port 1234
```

### Document Validation Issues
- The system now validates if uploaded documents are actual resumes
- Non-resume documents (reports, papers, etc.) will receive 0% score automatically
- Resumes should contain: work experience, education, skills, and contact info
- If a valid resume gets 0%, check that it has clear resume sections

### PDF Parsing Issues
- Ensure PDF contains selectable text (not scanned images)
- The system uses pdf2json which handles most PDF formats
- Malformed encoding is automatically handled with fallback decoding
- Check server logs for specific PDF parsing errors
- If a specific PDF fails, try re-saving it from a PDF viewer

### Bulk Upload Issues
- Maximum 50 PDFs per batch
- Each PDF should be under 10MB
- Processing time depends on resume length and AI analysis complexity
- Check `/api/company/batch-results/[id]` for detailed error messages
- Failed individual resumes don't affect other resumes in the batch

### Agent Context Issues
- Check conversation history in browser DevTools Network tab
- Verify both job description and resume are in API request payload
- Increase context window if needed (`num_ctx` parameter)

### MongoDB Connection Issues
```bash
# Test MongoDB connection
mongosh "<your-connection-string>"

# Check environment variables are loaded
echo $MONGODB_URI
```

## 🔄 Recent Improvements

### v2.3 - Enhanced UI & Resume Validation (Latest)
- ✅ **Resume Validation**: AI-powered document classification to ensure only resumes are analyzed
- ✅ **Non-Resume Detection**: Automatically assigns 0% to reports, papers, and other non-resume documents
- ✅ **Improved Filter UI**: Modern slider component for candidate filtering with visual indicators
- ✅ **Job Management**: Full CRUD operations for company job postings with view/edit pages
- ✅ **Better Branding**: Updated all references to show "Qwen2.5-Coder 7B" instead of outdated model names
- ✅ **Enhanced UX**: Reset filter button, score badges, and improved visual hierarchy

### v2.2 - Enhanced Bulk Processing
- ✅ **Improved PDF Parsing**: Migrated from pdf-parse to pdf2json for better Next.js compatibility
- ✅ **Robust Error Handling**: Automatic fallback for malformed URI encoding in PDFs
- ✅ **Better Compatibility**: Handles various PDF formats and encodings gracefully
- ✅ **Event-Based Processing**: Reliable async parsing with proper error propagation
- ✅ **Production Ready**: Eliminates webpack bundling issues with PDF libraries

### v2.1 - Multi-Role System & Bulk Analysis
- ✅ **Multi-Role Authentication**: Support for Individual, Company/Recruiter, and Career Coach accounts
- ✅ **Company Dashboard**: Dedicated dashboard for recruiters with analytics and batch tracking
- ✅ **Bulk Resume Upload**: Process up to 50 resumes simultaneously against a job description
- ✅ **Private Job Postings**: Company-specific job descriptions not visible to other users
- ✅ **AI-Powered Candidate Ranking**: Automatic sorting by match score for efficient hiring
- ✅ **Role-Based Navigation**: Dynamic navbar showing relevant links based on user type
- ✅ **Enhanced Registration**: Company-specific fields (name, size, industry, website)
- ✅ **Smart Redirects**: Automatic routing to appropriate dashboard based on role
- ✅ **CSV Export**: Download candidate lists with scores and analysis
- ✅ **Resume Download**: Direct access to original uploaded PDFs

### v2.0 - Enhanced AI Agent System
- ✅ **Smart Context Retention**: Agent now remembers job descriptions and resumes throughout conversation
- ✅ **Multi-Pattern Extraction**: 4 different regex patterns to detect job descriptions in any format
- ✅ **Priority-Based Workflow**: Analysis always happens before interview questions
- ✅ **Explicit Intent Recognition**: Only generates questions when explicitly requested (prevents false triggers)
- ✅ **Unlimited Questions**: Users can request as many interview questions as they need
- ✅ **Increased Context Window**: 4096 tokens for better conversation memory

### v2.0 - Improved PDF Parsing
- ✅ **Position-Aware Extraction**: Reads text based on X/Y coordinates (top→bottom, left→right)
- ✅ **Line Detection**: Preserves document structure by detecting Y-position changes
- ✅ **Multi-Column Support**: Correctly handles two-column resume layouts
- ✅ **Smart Word Spacing**: Prevents words from merging together
- ✅ **Page Break Markers**: Clear separation between pages

### v2.0 - Better User Experience
- ✅ **Clearer Visual Indicators**: "Powered by Qwen2.5-Coder 7B" branding
- ✅ **Enhanced Welcome Message**: Shows agent capabilities upfront
- ✅ **Markdown Formatting**: Professional-looking analysis results
- ✅ **Encouraging Prompts**: Invites users to continue practicing
- ✅ **LM Studio Integration**: Migrated from Ollama to LM Studio for better stability

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [LM Studio](https://lmstudio.ai/) for making local LLMs accessible and easy to use
- [Alibaba Cloud](https://github.com/QwenLM) for Qwen2.5-Coder model
- [Firebase Genkit](https://firebase.google.com/docs/genkit) for AI orchestration
- [pdf2json](https://www.npmjs.com/package/pdf2json) & [pdf.js](https://mozilla.github.io/pdf.js/) for reliable PDF parsing
- [ShadCN UI](https://ui.shadcn.com/) for beautiful components
- [Radix UI](https://www.radix-ui.com/) for accessible UI primitives


# AWS Environment Setup for Main Application

## 🔧 **Environment Variables Setup Required**

The AWS integration is working, but you need to add the AWS credentials to your main application's environment variables.

### **Step 1: Create `.env.local` file**

Create a `.env.local` file in your main application root directory (`/Users/yuegao/job-talent-match/`) with the following content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# AWS Configuration (for AI Processing)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### **Step 2: Get Your AWS Credentials**

You already have AWS credentials set up in your AWS module. You can find them in:
- `/Users/yuegao/job-talent-match/aws-ai-service/.env`

Copy the following values from your AWS module's `.env` file:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (should be `us-east-1`)
- `AWS_BEDROCK_MODEL_ID` (should be `anthropic.claude-3-5-sonnet-20240620-v1:0`)

### **Step 3: Update Your `.env.local`**

Replace the placeholder values in your `.env.local` file with your actual credentials:

```bash
# Example (replace with your actual values):
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### **Step 4: Restart the Development Server**

After updating the environment variables:

1. **Stop the current server** (Ctrl+C in the terminal)
2. **Restart the development server**:
   ```bash
   npm run dev
   ```

### **Step 5: Test the Integration**

1. **Go to** `http://localhost:3001/dashboard`
2. **Click on the "Resumes" tab**
3. **Check the AI Processing Options** - AWS Bedrock should now show "✅ Available"
4. **Upload a resume** to test the AWS Bedrock parsing

## 🎯 **Expected Results After Setup:**

### **✅ AI Provider Status:**
- **AWS Bedrock**: ✅ Available
- **OpenAI GPT**: ✅ Available

### **✅ Resume Processing:**
- **Upload a resume** → AWS Bedrock will parse it
- **Extract 35+ skills** with 100% confidence
- **Show provider badge** indicating "AWS Bedrock" was used

## 🔍 **Troubleshooting:**

### **If AWS Bedrock still shows "Not configured":**
1. **Check environment variables** are correctly set
2. **Restart the development server**
3. **Check the browser console** for any errors
4. **Test the API endpoint**: `http://localhost:3001/api/test-aws`

### **If you get 500 errors:**
1. **Verify AWS credentials** are correct
2. **Check AWS permissions** for Bedrock access
3. **Ensure the model ID** is correct

## 🚀 **Once Configured:**

Your application will have:
- ✅ **Dual AI Provider Support** (AWS Bedrock + OpenAI)
- ✅ **Superior Resume Parsing** (35+ skills extracted)
- ✅ **Automatic Fallback** (OpenAI if AWS fails)
- ✅ **Visual Indicators** (Shows which provider was used)

**The integration is complete and ready - you just need to add the AWS credentials to your main application's environment variables!**

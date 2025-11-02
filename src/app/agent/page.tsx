
'use client';

import { useState, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Paperclip, User, Bot, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        role: 'model',
        content: "👋 Hello! I'm your **AI Career Agent** powered by Qwen2.5-Coder 7B.\n\nI can help you:\n- 📊 Analyze your resume against job descriptions\n- 🎯 Identify skill gaps and strengths\n- 💼 Generate interview practice questions\n- 🚀 Provide career guidance\n\n**To get started:** Share a job description you're interested in, then upload your resume for analysis!"
    }
  ]);
  const [input, setInput] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [messages]);

  const extractTextFromPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Sort items by position (top to bottom, left to right)
      const items = content.items
        .filter(item => 'str' in item && item.str.trim().length > 0)
        .sort((a: any, b: any) => {
          // Sort by Y position first (top to bottom)
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
          // Then by X position (left to right)
          return a.transform[4] - b.transform[4];
        });
      
      let lastY = -1;
      let lineText = '';
      
      for (const item of items) {
        if (!('str' in item)) continue;
        
        const text = item.str;
        const y = item.transform[5];
        const x = item.transform[4];
        
        // New line detected (Y position changed significantly)
        if (lastY !== -1 && Math.abs(lastY - y) > 5) {
          if (lineText.trim()) {
            fullText += lineText.trim() + '\n';
          }
          lineText = text;
        } else {
          // Same line - add space if needed
          if (lineText && !lineText.endsWith(' ') && !text.startsWith(' ')) {
            lineText += ' ';
          }
          lineText += text;
        }
        
        lastY = y;
      }
      
      // Add last line
      if (lineText.trim()) {
        fullText += lineText.trim() + '\n';
      }
      
      // Add page separator
      if (i < pdf.numPages) {
        fullText += '\n--- Page Break ---\n\n';
      }
    }
    
    return fullText.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !resumeFile) return;

    setIsLoading(true);
    
    let userMessageContent = input;
    let combinedPrompt = input;

    // Add user's text message to chat
    const newMessages: ChatMessage[] = [...messages];
    if (input.trim()) {
        newMessages.push({ role: 'user', content: userMessageContent });
    }

    if (resumeFile) {
        const fileMessageContent = `[Attached Resume: ${resumeFile.name}]`;
        if (newMessages[newMessages.length - 1]?.role === 'user') {
            newMessages[newMessages.length - 1].content += `\n\n${fileMessageContent}`;
        } else {
            newMessages.push({ role: 'user', content: fileMessageContent });
        }

        try {
            const resumeText = await extractTextFromPdf(resumeFile);
            // Mark resume content very clearly for better extraction
            combinedPrompt += `\n\n**RESUME CONTENT PROVIDED:**\nHere is the resume text:\n${resumeText}\n**END OF RESUME CONTENT**`;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not read the resume PDF file.' });
            setIsLoading(false);
            return;
        }
    }

    setMessages(newMessages);
    setInput('');
    setResumeFile(null);
    if(fileInputRef.current) fileInputRef.current.value = '';

    
    try {
        // Send more context history (last 8 messages) for better context awareness
        const historyForApi = newMessages
            .slice(Math.max(0, newMessages.length - 8), -1) // Last 8 messages
            .map(msg => ({
                role: msg.role,
                content: [{ text: msg.content }]
            }));

        const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: historyForApi,
                prompt: combinedPrompt,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'The agent failed to respond.');
        }

        const data = await response.json();
        setMessages(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (error: any) {
        setMessages(prev => [...prev, { role: 'model', content: `Sorry, an error occurred: ${error.message}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen container mx-auto p-4 pt-24 sm:pt-28 md:pt-32 flex justify-center">
      <Card className="w-full max-w-3xl flex flex-col" style={{height: 'calc(100vh - 12rem)'}}>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot className="text-primary" /> AI Career Agent
          </CardTitle>
          <CardDescription>
            Powered by <span className="font-semibold text-foreground">Qwen2.5-Coder 7B</span> • Chat with our AI agent to analyze your resume against job descriptions and prepare for interviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'model' && <Bot className="w-6 h-6 text-primary flex-shrink-0" />}
                    <div className={`rounded-lg px-4 py-3 max-w-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                         <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-inherit" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    </div>
                    {message.role === 'user' && <User className="w-6 h-6 text-muted-foreground flex-shrink-0" />}
                </div>
              ))}
              {isLoading && (
                  <div className="flex items-start gap-4">
                      <Bot className="w-6 h-6 text-primary flex-shrink-0" />
                      <div className="rounded-lg px-4 py-3 max-w-lg bg-muted flex items-center">
                          <Loader2 className="w-5 h-5 animate-spin"/>
                      </div>
                  </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex items-center gap-4">
                <Input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask me to analyze your resume..."
                    className="flex-1"
                    disabled={isLoading}
                />
                
                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Attach Resume">
                    <Paperclip className={resumeFile ? 'text-primary' : ''} />
                </Button>
                <Input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={e => setResumeFile(e.target.files?.[0] || null)}
                    accept=".pdf"
                />

              <Button type="submit" disabled={isLoading || (!input.trim() && !resumeFile)}>
                <Send/>
              </Button>
            </form>
            {resumeFile && <p className="text-xs text-muted-foreground mt-2">Attached: {resumeFile.name}</p>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

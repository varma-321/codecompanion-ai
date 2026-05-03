import { useState, useEffect, useRef, useMemo } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle2, ChevronRight, Inbox, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUser } from '@/lib/user-context';
import { 
  fetchUserIssues, fetchIssueMessages, addIssueMessage, 
  fetchDirectMessages, sendDirectMessage, searchUsers,
  DbIssue, DbIssueMessage, DbDirectMessage, PublicProfile 
} from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function Mailbox() {
  const { authUser } = useUser();
  const [issues, setIssues] = useState<DbIssue[]>([]);
  const [directMessages, setDirectMessages] = useState<DbDirectMessage[]>([]);
  const [messages, setMessages] = useState<DbIssueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DbIssue | null>(null);
  const [selectedDM, setSelectedDM] = useState<DbDirectMessage | null>(null);
  const [activeView, setActiveView] = useState<'support' | 'messages'>('support');
  const [activeTab, setActiveTab] = useState('all');
  const [newMessage, setNewMessage] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Conversations grouping
  const conversations = useMemo(() => {
    if (!authUser) return [];
    const groups: Record<string, { lastMsg: DbDirectMessage, messages: DbDirectMessage[], otherUser: string, otherUserId: string }> = {};
    
    directMessages.forEach(msg => {
      const otherUserId = msg.sender_id === authUser.id ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === authUser.id ? msg.receiver_username : msg.sender_username;
      
      if (!groups[otherUserId]) {
        groups[otherUserId] = { lastMsg: msg, messages: [], otherUser, otherUserId };
      }
      groups[otherUserId].messages.push(msg);
      if (new Date(msg.created_at) > new Date(groups[otherUserId].lastMsg.created_at)) {
        groups[otherUserId].lastMsg = msg;
      }
    });
    
    return Object.values(groups).sort((a, b) => 
      new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
    );
  }, [directMessages, authUser]);

  const selectedConversation = useMemo(() => {
    if (!selectedDM || !authUser) return null;
    const otherUserId = selectedDM.sender_id === authUser.id ? selectedDM.receiver_id : selectedDM.sender_id;
    return conversations.find(c => c.otherUserId === otherUserId);
  }, [conversations, selectedDM, authUser]);
  
  // Compose Dialog State
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [composeTo, setComposeTo] = useState<PublicProfile | null>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeContent, setComposeContent] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authUser) {
      loadData();
      
      // Subscribe to new direct messages
      const channel = supabase.channel('direct_messages_realtime')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages' 
        }, (payload) => {
          // If it's for us or from us, refresh
          if (payload.new.receiver_id === authUser.id || payload.new.sender_id === authUser.id) {
            loadData();
          }
        })
        .subscribe();
      
      return () => { channel.unsubscribe(); };
    }
  }, [authUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!authUser) return;
      const [issuesData, dmData] = await Promise.all([
        fetchUserIssues(authUser.id),
        fetchDirectMessages(authUser.id)
      ]);
      setIssues(issuesData);
      setDirectMessages(dmData);
    } catch (error) {
      toast.error("Failed to load mailbox");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIssue) {
      loadMessages(selectedIssue.id);
      setSelectedDM(null);
    }
  }, [selectedIssue]);

  useEffect(() => {
    if (selectedDM) {
      setSelectedIssue(null);
      setMessages([]);
      setReplyContent("");
    }
  }, [selectedDM]);

  const loadMessages = async (issueId: string) => {
    setMessagesLoading(true);
    try {
      const data = await fetchIssueMessages(issueId);
      setMessages(data);
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSearchUsers = async (val: string) => {
    setSearchQuery(val);
    const isNum = !isNaN(Number(val)) && val.trim() !== "";
    
    // Allow single digit ID searches, but keep 2+ chars for names to avoid noise
    if (val.length < (isNum ? 1 : 2)) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(val);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSendDM = async () => {
    if (!composeTo || !composeContent.trim() || !authUser) return;
    setSending(true);
    try {
      await sendDirectMessage(authUser.id, composeTo.user_id, composeSubject || "No Subject", composeContent);
      toast.success("Message sent successfully");
      setComposeOpen(false);
      setComposeTo(null);
      setComposeSubject("");
      setComposeContent("");
      loadData(); // Refresh DMs
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReplyDM = async () => {
    if (!selectedDM || !replyContent.trim() || !authUser) return;
    
    const isSender = selectedDM.sender_id === authUser.id;
    const recipientId = isSender ? selectedDM.receiver_id : selectedDM.sender_id;
    const recipientUsername = isSender ? selectedDM.receiver_username : selectedDM.sender_username;
    const subject = selectedDM.subject.startsWith("Re: ") 
      ? selectedDM.subject 
      : `Re: ${selectedDM.subject}`;

    // Optimistic update — instant feedback for sender
    const optimisticMsg: DbDirectMessage = {
      id: `temp-${Date.now()}`,
      sender_id: authUser.id,
      receiver_id: recipientId,
      sender_username: authUser.email?.split('@')[0] || 'You',
      receiver_username: recipientUsername || '',
      subject,
      content: replyContent,
      is_read: false,
      created_at: new Date().toISOString(),
    } as DbDirectMessage;

    setDirectMessages(prev => [optimisticMsg, ...prev]);
    const sentContent = replyContent;
    setReplyContent("");
    
    setSending(true);
    try {
      const newMsg = await sendDirectMessage(authUser.id, recipientId, subject, sentContent);
      // Replace optimistic message with real one
      setDirectMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...newMsg, sender_username: optimisticMsg.sender_username, receiver_username: optimisticMsg.receiver_username } as DbDirectMessage : m));
    } catch (error) {
      toast.error("Failed to send reply");
      // Rollback optimistic update
      setDirectMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setReplyContent(sentContent);
    } finally {
      setSending(false);
    }
  };

  const handleSendIssueReply = async () => {
    if (!selectedIssue || !newMessage.trim() || !authUser) return;
    setSending(true);
    try {
      const msg = await addIssueMessage(selectedIssue.id, authUser.id, 'user', newMessage);
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredIssues = issues.filter(i => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return i.status === 'open';
    if (activeTab === 'solved') return i.status !== 'open';
    return true;
  });

  return (
    <AppShell title="Mailbox" subtitle="Your reports, messages and support tickets">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
        {/* Sidebar / List */}
        <Card className="md:col-span-4 flex flex-col overflow-hidden border-sidebar-border bg-card/50">
          <CardHeader className="px-4 py-3 border-b border-sidebar-border shrink-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="flex-1">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="support" className="text-[10px] uppercase font-bold">Support</TabsTrigger>
                  <TabsTrigger value="messages" className="text-[10px] uppercase font-bold">Messages</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setComposeOpen(true)}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {activeView === 'support' && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-7 bg-muted/50">
                  <TabsTrigger value="all" className="text-[9px] uppercase">All</TabsTrigger>
                  <TabsTrigger value="open" className="text-[9px] uppercase">Open</TabsTrigger>
                  <TabsTrigger value="solved" className="text-[9px] uppercase">Solved</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-sidebar-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))
              ) : activeView === 'support' ? (
                filteredIssues.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No reports found</p>
                  </div>
                ) : (
                  filteredIssues.map(issue => (
                    <button
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`w-full text-left p-4 transition-colors hover:bg-sidebar-accent/50 group ${selectedIssue?.id === issue.id ? 'bg-sidebar-accent' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold truncate line-clamp-1 flex-1">{issue.page_title}</span>
                        <Badge variant={issue.status === 'open' ? 'destructive' : 'default'} className="text-[8px] h-4 px-1 shrink-0">
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 italic">"{issue.comment}"</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
                        <span>{formatDistanceToNow(new Date(issue.created_at))} ago</span>
                        {issue.admin_reply && <Mail className="h-3 w-3 text-primary" />}
                      </div>
                    </button>
                  ))
                )
              ) : (
                conversations.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Mail className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No messages found</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.otherUserId}
                      onClick={() => setSelectedDM(conv.lastMsg)}
                      className={`w-full text-left p-4 transition-colors hover:bg-sidebar-accent/50 group ${
                        selectedDM && (selectedDM.sender_id === conv.otherUserId || selectedDM.receiver_id === conv.otherUserId) 
                          ? 'bg-sidebar-accent' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold truncate line-clamp-1 flex-1">{conv.otherUser}</span>
                        {!conv.lastMsg.is_read && conv.lastMsg.receiver_id === authUser?.id && <Badge className="bg-primary text-[8px] h-3 px-1">New</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                        {conv.lastMsg.subject}
                      </p>
                      <div className="text-[10px] text-muted-foreground/70 font-mono">
                        {formatDistanceToNow(new Date(conv.lastMsg.created_at))} ago
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Content Area */}
        <Card className="md:col-span-8 flex flex-col overflow-hidden border-sidebar-border bg-card/50">
          {selectedIssue ? (
            <>
              <CardHeader className="px-6 py-4 border-b border-sidebar-border shrink-0 bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{selectedIssue.page_title}</CardTitle>
                    <CardDescription className="text-xs font-mono mt-1 truncate max-w-md">
                      Support Ticket #{selectedIssue.id.split('-')[0]}
                    </CardDescription>
                  </div>
                  <Badge variant={selectedIssue.status === 'open' ? 'destructive' : 'default'} className="uppercase tracking-widest text-[10px]">
                    {selectedIssue.status}
                  </Badge>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messagesLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={msg.id} className={`flex gap-4 ${msg.sender_role === 'admin' ? 'justify-end' : ''}`}>
                        {msg.sender_role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                        )}
                        <div className={`space-y-1.5 ${msg.sender_role === 'admin' ? 'text-right flex flex-col items-end' : ''}`}>
                          <div className="flex items-center gap-2">
                            {msg.sender_role === 'admin' ? (
                              <>
                                <span className="text-[10px] text-muted-foreground italic">Admin Team responded</span>
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                  Support <CheckCircle2 className="h-3 w-3" />
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-bold">You</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                              </>
                            )}
                          </div>
                          <div className={`p-4 rounded-2xl border text-sm leading-relaxed max-w-2xl ${
                            msg.sender_role === 'admin' 
                              ? 'bg-primary/10 text-primary-foreground/90 rounded-tr-none border-primary/20 text-left' 
                              : 'bg-muted/50 rounded-tl-none border-border'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                        {msg.sender_role === 'admin' && (
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg">
                            <Mail className="h-4 w-4" />
                          </div>
                        )}
                        {index === messages.length - 1 && <div ref={scrollRef} />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {selectedIssue.status === 'open' ? (
                <div className="p-4 border-t border-sidebar-border bg-card">
                   <div className="relative">
                     <Textarea
                       placeholder="Type your follow-up message..."
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       className="min-h-[80px] pr-12 resize-none bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                     />
                     <Button 
                       size="icon" 
                       className="absolute bottom-2 right-2 h-8 w-8"
                       disabled={!newMessage.trim() || sending}
                       onClick={handleSendIssueReply}
                     >
                       {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                     </Button>
                   </div>
                </div>
              ) : (
                <div className="p-4 border-t border-sidebar-border bg-muted/10 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs font-bold text-success">This ticket is closed.</span>
                </div>
              )}
            </>
          ) : selectedConversation ? (
            <>
              <CardHeader className="px-6 py-4 border-b border-sidebar-border shrink-0 bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 border border-primary/20">
                      {selectedConversation.otherUser[0].toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black">{selectedConversation.otherUser}</CardTitle>
                      <CardDescription className="text-[10px] uppercase tracking-widest">Active Conversation</CardDescription>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {selectedConversation.messages.length} messages
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  {[...selectedConversation.messages].reverse().map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender_id === authUser?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] space-y-1 ${msg.sender_id === authUser?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-sm ${
                          msg.sender_id === authUser?.id 
                            ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md' 
                            : 'bg-muted/50 border border-border rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                        <div className="text-[8px] text-muted-foreground font-mono px-1">
                          {formatDistanceToNow(new Date(msg.created_at))} ago
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-sidebar-border bg-card">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Reply to ${selectedConversation.otherUser}...`}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReplyDM()}
                    className="h-10 text-sm bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  />
                  <Button 
                    size="icon" 
                    className="h-10 w-10 shrink-0"
                    disabled={!replyContent.trim() || sending}
                    onClick={handleReplyDM}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-40">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Select a message</h3>
                <p className="text-xs text-muted-foreground mt-1">Pick a thread from the list to view the conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send a message to another user by their Username or System ID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!composeTo ? (
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Input 
                  placeholder="Search by username or ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                />
                <div className="mt-2 space-y-1">
                  {searching ? (
                    <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : searchResults.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => setComposeTo(user)}
                      className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center justify-between"
                    >
                      <span>{user.username}</span>
                      <span className="text-[10px] text-muted-foreground">ID: {user.display_id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm font-bold">To: {composeTo.username}</span>
                  <Button variant="ghost" size="sm" onClick={() => setComposeTo(null)} className="h-6 text-[10px]">Change</Button>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input 
                    placeholder="Message subject..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    placeholder="Write your message here..."
                    className="min-h-[150px]"
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button disabled={!composeTo || !composeContent.trim() || sending} onClick={handleSendDM}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

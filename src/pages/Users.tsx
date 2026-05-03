import { useState, useEffect } from 'react';
import { Search, User, Trophy, Calendar, Mail, Loader2, Award, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchUsers, PublicProfile, sendDirectMessage } from '@/lib/supabase';
import { useUser } from '@/lib/user-context';
import AppShell from '@/components/AppShell';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Users() {
  const { authUser } = useUser();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicProfile | null>(null);
  
  // Message Dialog
  const [messageOpen, setMessageOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    setLoading(true);
    try {
      const results = await searchUsers(val);
      setUsers(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !content.trim() || !authUser) return;
    setSending(true);
    try {
      await sendDirectMessage(authUser.id, selectedUser.user_id, subject || "No Subject", content);
      toast.success(`Message sent to ${selectedUser.username}`);
      setMessageOpen(false);
      setSubject('');
      setContent('');
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell title="Users" subtitle="Find and connect with other developers">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
        {/* Search & List */}
        <div className="md:col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by username or System ID..."
              className="pl-10"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <Card className="flex-1 overflow-hidden border-sidebar-border bg-card/50">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : users.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">No users found</div>
                ) : (
                  users.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 rounded-lg transition-all hover:bg-sidebar-accent flex items-center gap-3 ${selectedUser?.user_id === user.user_id ? 'bg-sidebar-accent shadow-sm ring-1 ring-primary/20' : ''}`}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-bold text-sm truncate">{user.username}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>ID: {user.display_id}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                          <span>{user.solved_count} Solved</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Profile Details */}
        <Card className="md:col-span-8 overflow-hidden border-sidebar-border bg-card/50 flex flex-col">
          {selectedUser ? (
            <>
              <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent relative">
                <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                  <div className="h-24 w-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-4xl font-black text-primary">
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div className="pb-2 space-y-1">
                    <h2 className="text-2xl font-black tracking-tight">{selectedUser.username}</h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span className="px-2 py-0.5 bg-muted rounded">System ID: {selectedUser.display_id}</span>
                      <span>Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 right-8 flex gap-2">
                  <Button size="sm" className="gap-2" onClick={() => setMessageOpen(true)}>
                    <Mail className="h-4 w-4" /> Message
                  </Button>
                </div>
              </div>

              <div className="mt-16 flex-1 p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Solved</span>
                    </div>
                    <div className="text-2xl font-black">{selectedUser.solved_count}</div>
                    <div className="text-[10px] text-muted-foreground">Total problems completed</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Attempted</span>
                    </div>
                    <div className="text-2xl font-black">{selectedUser.attempted_count}</div>
                    <div className="text-[10px] text-muted-foreground">Total unique attempts</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <Clock className="h-5 w-5 text-green-500" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Last Active</span>
                    </div>
                    <div className="text-xs font-bold">
                      {selectedUser.last_active ? formatDistanceToNow(new Date(selectedUser.last_active)) + ' ago' : 'Never'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Platform activity</div>
                  </div>
                </div>

                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2">
                        <Calendar className="h-8 w-8 text-muted-foreground/30" />
                        <div className="text-sm font-bold">Activity Heatmap</div>
                        <p className="text-xs text-muted-foreground">Detailed activity history is only visible to the user.</p>
                      </div>
                      <div className="p-6 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2">
                        <Award className="h-8 w-8 text-muted-foreground/30" />
                        <div className="text-sm font-bold">Skills Radar</div>
                        <p className="text-xs text-muted-foreground">Skill breakdown will appear once more problems are solved.</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="achievements" className="py-4">
                    <div className="text-center py-10 opacity-40">
                      <Trophy className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-sm font-medium">No public achievements yet</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-bold">Select a User</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Search and select a developer to see their coding progress, achievements, and send them a message.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Send an internal message to this user. It will appear in their mailbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input 
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                placeholder="Write your message..."
                className="min-h-[150px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button disabled={!content.trim() || sending} onClick={handleSendMessage}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Trash2, ThumbsUp, Loader2, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Post {
  id: string;
  problem_key: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes: number;
  created_at: string;
  updated_at: string;
  username?: string;
  replies?: Post[];
}

const DiscussionForum = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const problemKey = searchParams.get('problem') || '';
  const { authUser } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = async () => {
    const { data: postsData } = await supabase
      .from('discussion_posts')
      .select('*')
      .eq('problem_key', problemKey)
      .order('created_at', { ascending: false });

    if (!postsData) { setLoading(false); return; }

    // Fetch usernames
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const withNames = postsData.map(p => ({ ...p, username: profileMap.get(p.user_id) || 'Anonymous' }));
    const topLevel = withNames.filter(p => !p.parent_id);
    const replies = withNames.filter(p => p.parent_id);

    const threaded = topLevel.map(p => ({
      ...p,
      replies: replies.filter(r => r.parent_id === p.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));

    setPosts(threaded);
    setLoading(false);
  };

  useEffect(() => {
    if (problemKey) loadPosts();
    else setLoading(false);
  }, [problemKey]);

  const handlePost = async () => {
    if (!authUser || !content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('discussion_posts').insert({
      problem_key: problemKey, user_id: authUser.id, content: content.trim(),
    });
    if (error) toast.error('Failed to post');
    else { setContent(''); await loadPosts(); toast.success('Posted!'); }
    setSubmitting(false);
  };

  const handleReply = async (parentId: string) => {
    if (!authUser || !replyContent.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('discussion_posts').insert({
      problem_key: problemKey, user_id: authUser.id, content: replyContent.trim(), parent_id: parentId,
    });
    if (error) toast.error('Failed to reply');
    else { setReplyContent(''); setReplyTo(null); await loadPosts(); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('discussion_posts').delete().eq('id', id);
    await loadPosts();
    toast.success('Deleted');
  };

  const handleLike = async (id: string, current: number) => {
    await supabase.from('discussion_posts').update({ likes: current + 1 }).eq('id', id);
    await loadPosts();
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <MessageSquare className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">Discussion</span>
        {problemKey && <Badge variant="outline" className="text-[10px]">{problemKey}</Badge>}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {!problemKey && (
            <div className="text-center py-16">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-semibold">No problem selected</p>
              <p className="text-sm text-muted-foreground mt-1">Open a problem and click "Discuss" to start a conversation.</p>
            </div>
          )}

          {problemKey && authUser && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <Textarea
                  placeholder="Share your thoughts, approach, or ask a question..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handlePost} disabled={submitting || !content.trim()} className="gap-1.5 text-xs">
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 && problemKey ? (
            <p className="text-center text-sm text-muted-foreground py-8">No discussions yet. Be the first to start one!</p>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <Card key={post.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-foreground">{post.username}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleLike(post.id, post.likes)}>
                        <ThumbsUp className="h-3 w-3" /> {post.likes}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}>
                        <Reply className="h-3 w-3" /> Reply
                      </Button>
                      {authUser?.id === post.user_id && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-destructive" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Replies */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="ml-6 mt-3 space-y-2 border-l-2 border-border pl-3">
                        {post.replies.map(reply => (
                          <div key={reply.id} className="text-xs">
                            <span className="font-semibold text-foreground">{reply.username}</span>
                            <span className="text-muted-foreground ml-2">{formatTime(reply.created_at)}</span>
                            <p className="text-foreground mt-0.5">{reply.content}</p>
                            {authUser?.id === reply.user_id && (
                              <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 text-destructive mt-1" onClick={() => handleDelete(reply.id)}>
                                <Trash2 className="h-2.5 w-2.5" /> Delete
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {replyTo === post.id && (
                      <div className="ml-6 mt-2 flex gap-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          className="min-h-[50px] text-xs flex-1"
                        />
                        <Button size="sm" onClick={() => handleReply(post.id)} disabled={submitting || !replyContent.trim()} className="h-8 text-xs">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionForum;

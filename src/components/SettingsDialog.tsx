import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Lock, Shield, Bell, Palette, LogOut, Loader2, CheckCircle, Save } from 'lucide-react';
import { checkBackendStatus } from '@/lib/ai-backend';
import { useUser } from '@/lib/user-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/integrations/supabase/client';
import { signOut } from '@/lib/supabase';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { authUser, profile, setProfile } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'appearance' | 'security'>('profile');

  // Profile edit state
  const [editUsername, setEditUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (open) {
      checkBackendStatus().then(setBackendOnline);
      setEditUsername(profile?.username || '');
    }
  }, [open, profile]);

  const handleSaveProfile = async () => {
    if (!authUser || !editUsername.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editUsername.trim() })
        .eq('id', authUser.id);
      if (error) throw error;
      setProfile(profile ? { ...profile, username: editUsername.trim() } : null);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { toast.error('Enter a new password'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    }
    setChangingPassword(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch {}
  };

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: <User className="h-3.5 w-3.5" /> },
    { key: 'account' as const, label: 'Account', icon: <Mail className="h-3.5 w-3.5" /> },
    { key: 'appearance' as const, label: 'Appearance', icon: <Palette className="h-3.5 w-3.5" /> },
    { key: 'security' as const, label: 'Security', icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border pb-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Username</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="h-9 text-sm rounded-lg"
                    placeholder="Your username"
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || editUsername === profile?.username}
                  >
                    {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{authUser?.email || 'Not set'}</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Member Since</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium">Account Status</Label>
                <div className="mt-1">
                  <Badge variant={profile?.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                    {profile?.status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Code Execution</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Java code is compiled and run using the <strong>deployed backend</strong>.
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  ℹ️ The server may take ~30s to wake up on first request.
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">AI Service</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  All AI features are powered by cloud AI.
                  {backendOnline ? (
                    <span className="ml-1 text-emerald-500 font-medium">● Online</span>
                  ) : (
                    <span className="ml-1 text-destructive font-medium">● Offline</span>
                  )}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">AI Features</Label>
                <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <li>• Code analysis & complexity detection</li>
                  <li>• 4-level progressive hints</li>
                  <li>• Brute / Better / Optimal solutions</li>
                  <li>• Pattern detection & mistake finder</li>
                  <li>• Edge cases & test case generation</li>
                  <li>• Free-form chat about your code</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle between light and dark themes</p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Current Theme</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Active: <Badge variant="outline" className="text-[10px] ml-1">{theme === 'dark' ? 'Dark' : 'Light'}</Badge>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Change Password</Label>
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="h-9 rounded-lg pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-9 rounded-lg pl-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="h-9 gap-1.5 text-xs"
                  >
                    {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Update Password
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Sign out of your account</p>
                <Button variant="destructive" size="sm" onClick={handleLogout} className="h-9 gap-1.5 text-xs">
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

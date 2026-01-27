import { useState, useEffect } from 'react';
import { Youtube, Save, Link2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Already a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  // Various YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function PlatformSettings() {
  const { toast } = useToast();
  const [tutorialLink, setTutorialLink] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'tutorial_video_id')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setCurrentVideoId(data.value);
        setTutorialLink(`https://youtube.com/watch?v=${data.value}`);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTutorial = async () => {
    const videoId = extractYouTubeId(tutorialLink);
    
    if (!videoId && tutorialLink.trim()) {
      toast({
        title: 'Invalid YouTube Link',
        description: 'Please enter a valid YouTube video URL',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'tutorial_video_id',
          value: videoId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      setCurrentVideoId(videoId);
      toast({
        title: 'Settings Saved',
        description: videoId 
          ? 'Tutorial video has been updated successfully.'
          : 'Tutorial video has been removed.',
      });
    } catch (error) {
      console.error('Error saving platform settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const extractedId = extractYouTubeId(tutorialLink);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Youtube className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <CardTitle>Tutorial Video</CardTitle>
            <CardDescription>
              Set a global tutorial video that all users can access from the sidebar
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tutorial-link">YouTube Video Link</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="tutorial-link"
                value={tutorialLink}
                onChange={(e) => setTutorialLink(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleSaveTutorial} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports youtube.com, youtu.be, and YouTube Shorts links
          </p>
        </div>

        {/* Preview */}
        {extractedId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Video ID detected: <code className="bg-muted px-1 rounded">{extractedId}</code></span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted max-w-md">
              <iframe
                src={`https://www.youtube.com/embed/${extractedId}`}
                title="Tutorial Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {currentVideoId && !extractedId && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              Current video ID: <code className="bg-background px-1 rounded">{currentVideoId}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

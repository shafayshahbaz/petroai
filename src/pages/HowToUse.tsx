import { useEffect, useState } from 'react';
import { PlayCircle, Youtube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function HowToUse() {
  const { t } = useLanguage();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTutorialVideo = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'tutorial_video_id')
          .maybeSingle();

        if (error) throw error;
        setVideoId(data?.value || null);
      } catch (error) {
        console.error('Error fetching tutorial video:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutorialVideo();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('tutorialTitle')}</h1>
        <p className="text-muted-foreground">
          {t('tutorialDescription')}
        </p>
      </div>

      {/* Video Container */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <CardTitle>{t('tutorialTitle')}</CardTitle>
              <CardDescription>
                {t('tutorialDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full aspect-video rounded-lg" />
          ) : videoId ? (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Tutorial Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-muted flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-full bg-muted-foreground/10">
                <PlayCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  {t('tutorialComingSoon')}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {t('tutorialNotSet')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

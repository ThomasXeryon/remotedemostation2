import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Maximize2, Circle } from 'lucide-react';
import { TelemetryData } from '@/types';

interface VideoFeedProps {
  stationName: string;
  telemetry: TelemetryData | null;
  isRecording?: boolean;
}

export function VideoFeed({ stationName, telemetry, isRecording = true }: VideoFeedProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Live Camera Feed</CardTitle>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-600 flex items-center">
            <Video className="w-4 h-4 mr-1 text-green-500" />
            WebRTC • 1080p
          </span>
          <Button variant="ghost" size="sm">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4">
        <div className="relative h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden">
          {/* Real camera feed */}
          <video 
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            poster=""
          >
            <source src={`/api/camera-feed/${stationName}/stream`} type="video/webm" />
            <source src={`/api/camera-feed/${stationName}/stream`} type="video/mp4" />
            {/* Fallback for when camera is not available */}
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Camera feed unavailable</p>
                <p className="text-sm opacity-75">Check camera connection</p>
              </div>
            </div>
          </video>
          
          {/* Video Overlay Controls */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
            <div className="text-xs space-y-1">
              <div>
                Position: <span className="font-mono">
                  {telemetry?.position?.toFixed(1) || '0.0'}mm
                </span>
              </div>
              <div>
                Speed: <span className="font-mono">
                  {telemetry?.velocity?.toFixed(1) || '0.0'}mm/s
                </span>
              </div>
              <div>
                Load: <span className="font-mono">
                  {telemetry?.load?.toFixed(1) || '0.0'}%
                </span>
              </div>
            </div>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500/90 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
              <Circle className="w-2 h-2 fill-current animate-pulse" />
              <span>REC</span>
            </div>
          )}

          {/* Crosshair Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-white/60 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 w-16 h-0.5 bg-white/60 transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-white/60 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

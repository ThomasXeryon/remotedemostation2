import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Gauge, 
  Zap, 
  Download, 
  Wifi,
  Activity 
} from 'lucide-react';
import { TelemetryData } from '@/types';

interface TelemetrySectionProps {
  telemetryData: TelemetryData[];
  connectionStats: {
    latency: number;
    packetsReceived: number;
    dataRate: number;
    lastHeartbeat: Date;
  };
  isConnected: boolean;
}

export function TelemetrySection({ 
  telemetryData, 
  connectionStats, 
  isConnected 
}: TelemetrySectionProps) {
  const latestData = telemetryData[0];

  const formatDataRate = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const timeSinceLastHeartbeat = latestData 
    ? Math.floor((Date.now() - new Date(latestData.timestamp).getTime()) / 1000)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Real-Time Telemetry</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-slate-600">
          <span>Update Rate: 10Hz</span>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export Data
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Telemetry Grid */}
        <div className="grid grid-cols-6 gap-6">
          {/* Live Metrics */}
          <div className="col-span-2 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Current Position</span>
                <MapPin className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {latestData?.position?.toFixed(1) || '0.0'}
                <span className="text-sm font-normal text-slate-500 ml-1">mm</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Velocity</span>
                <Gauge className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {latestData?.velocity?.toFixed(1) || '0.0'}
                <span className="text-sm font-normal text-slate-500 ml-1">mm/s</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Motor Load</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {latestData?.load?.toFixed(1) || '0.0'}
                <span className="text-sm font-normal text-slate-500 ml-1">%</span>
              </div>
            </div>
          </div>

          {/* Telemetry Graph */}
          <div className="col-span-4">
            <div className="bg-slate-50 rounded-lg p-4 h-64">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-700">Position vs Time</span>
                <div className="flex space-x-2">
                  <Badge variant="default" className="bg-blue-500">Position</Badge>
                  <Badge variant="outline">Velocity</Badge>
                  <Badge variant="outline">Load</Badge>
                </div>
              </div>
              
              {/* Mock Telemetry Graph */}
              <div className="h-40 relative bg-white border border-slate-200 rounded overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full">
                    {/* Vertical grid lines */}
                    {Array.from({ length: 11 }, (_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={`${i * 10}%`}
                        y1="0"
                        x2={`${i * 10}%`}
                        y2="100%"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {Array.from({ length: 9 }, (_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={`${i * 12.5}%`}
                        x2="100%"
                        y2={`${i * 12.5}%`}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                    ))}
                  </svg>
                </div>
                
                {/* Data visualization */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Real-time chart would be implemented here</p>
                    <p className="text-xs">Using Chart.js or similar library</p>
                  </div>
                </div>

                {/* Axis labels */}
                <div className="absolute bottom-1 left-1 text-xs text-slate-500">0mm</div>
                <div className="absolute top-1 left-1 text-xs text-slate-500">500mm</div>
                <div className="absolute bottom-1 right-1 text-xs text-slate-500">60s</div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Bar */}
        <div className={`flex items-center justify-between rounded-lg p-4 border ${
          isConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${
              isConnected ? 'text-green-700' : 'text-red-700'
            }`}>
              {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
            </span>
            {isConnected && (
              <span className={`text-sm ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                • Last heartbeat: {timeSinceLastHeartbeat}s ago
              </span>
            )}
          </div>
          
          {isConnected && (
            <div className="flex items-center space-x-6 text-sm text-green-600">
              <span>
                Latency: <span className="font-mono">{connectionStats.latency}ms</span>
              </span>
              <span>
                Packets: <span className="font-mono">{connectionStats.packetsReceived}</span>
              </span>
              <span>
                Data Rate: <span className="font-mono">{formatDataRate(connectionStats.dataRate)}</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

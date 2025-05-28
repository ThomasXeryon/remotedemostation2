import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Clock, TrendingUp } from "lucide-react";
import { PageLayout } from "@/components/page-layout";

export default function Analytics() {
  return (
    <PageLayout
      title="Analytics"
      subtitle="Monitor your demo station performance and usage"
    >
      <div className="grid-4-cols">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Connect analytics service to view data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Connect analytics service to view data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Connect analytics service to view data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commands Sent</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Connect analytics service to view data
              </p>
            </CardContent>
          </Card>
        </div>

      <div className="grid-2-cols">
        <div className="content-card">
          <h3 className="text-lg font-semibold mb-4">Usage Over Time</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart placeholder - Connect analytics service to view data
          </div>
        </div>

        <div className="content-card">
          <h3 className="text-lg font-semibold mb-4">Popular Stations</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart placeholder - Connect analytics service to view data
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
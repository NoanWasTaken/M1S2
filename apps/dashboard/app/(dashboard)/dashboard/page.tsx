'use client';

import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { AreaChart } from '@/components/dashboard/area-chart';
import { LiveList } from '@/components/dashboard/live-list';
import { DataTable } from '@/components/dashboard/data-table';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { ProgressList } from '@/components/dashboard/progress-list';
import { HelpButton } from '@/components/ui/help-button';
import { Header } from '@/components/dashboard/header';
import {
  kpiData,
  trafficData,
  activePagesData,
  topPagesData,
  trafficSourcesData,
  devicesData,
} from '@/lib/mock-data';

export default function OverviewPage() {
  return (
    <>
      <Header />

      <div className="flex flex-col gap-4 p-6">
        <KpiGrid>
          {kpiData.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </KpiGrid>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AreaChart data={trafficData} />
          </div>
          <div className="lg:col-span-1">
            <LiveList data={activePagesData} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataTable data={topPagesData} />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-1">
            <DonutChart data={trafficSourcesData} />
            <ProgressList data={devicesData} />
          </div>
        </div>
      </div>

      <HelpButton />
    </>
  );
}

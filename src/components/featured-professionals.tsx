'use client';
import { useCallback } from 'react';
import { DemoView } from './demo-view';
import { demoRepository } from '@/lib/demo/repository';
import { publicWhere } from '@/modules/queries';
import { ProfessionalCard } from './shared';
export function FeaturedProfessionals() {
  const load = useCallback(async () => {
    const workers = await demoRepository.workerProfile.findMany({
      where: publicWhere,
      take: 4,
      orderBy: { createdAt: 'asc' },
    });
    return (
      <div className="professional-grid">
        {workers.map((w) => (
          <ProfessionalCard key={w.id} worker={w} />
        ))}
      </div>
    );
  }, []);
  return <DemoView load={load} />;
}

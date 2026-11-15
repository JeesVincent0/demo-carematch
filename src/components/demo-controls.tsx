'use client';
import { useState } from 'react';
import { resetDemoData } from '@/lib/demo/store';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
export function ResetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Reset this browser’s demo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Start a fresh demonstration?</DialogTitle>
        <DialogDescription>
          This removes this browser’s demo accounts, requests and sample uploads and restores the
          bundled JSON examples. Other browsers are unaffected.
        </DialogDescription>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep my changes
          </Button>
          <Button
            onClick={() => {
              resetDemoData();
              window.location.assign('/');
            }}
          >
            Reset demo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

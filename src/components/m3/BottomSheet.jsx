import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

const SNAP_MAX = {
  peek: 'max-h-[28vh]',
  half: 'max-h-[55vh]',
  full: 'max-h-[calc(100dvh-var(--camera-inset-top))]'
};

export default function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  snap = 'half',
  children,
  className
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        data-testid="m3-bottom-sheet"
        className={cn(
          'mt-[var(--camera-inset-top)] bg-white border-slate-200 text-slate-900',
          SNAP_MAX[snap] || SNAP_MAX.half,
          className
        )}
        style={{ paddingBottom: 'var(--sheet-offset)' }}
      >
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title ? <DrawerTitle className="text-slate-900">{title}</DrawerTitle> : null}
            {description ? (
              <DrawerDescription className="text-slate-400">{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

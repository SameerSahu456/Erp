import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  Copy,
  Send,
  Save,
  Eye,
  FileText,
  Building2,
  CalendarDays,
  Hash,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuoteBuilderPanel } from '../components/QuoteBuilderPanel'

export default function QuoteBuilderPage() {
  const navigate = useNavigate()
  const [quoteRef] = useState(`Q-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`)

  return (
    <div className="space-y-6">
      {/* Modern header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate('/crm/quotes')}
          >
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Quote Builder
              </h1>
              <Badge className="bg-gradient-to-r from-primary/80 to-primary text-primary-foreground text-[10px] gap-1">
                <Sparkles className="size-3" />
                Advanced
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Build quotes with BOM configuration, IMS part selection, and PDF export
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/crm/quotes')}>
            <FileText className="size-4 mr-1.5" />
            All Quotes
          </Button>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Hash className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IMS Integration</p>
            <p className="text-sm font-medium">Part Catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">BOM Support</p>
            <p className="text-sm font-medium">Component Config</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Auto-Save</p>
            <p className="text-sm font-medium">Draft Recovery</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <Download className="size-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Export</p>
            <p className="text-sm font-medium">PDF Download</p>
          </div>
        </div>
      </div>

      {/* Quote Builder Panel */}
      <Card className="border-t-4 border-t-primary/20">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-5 text-primary" />
              New Quote
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Draft
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <QuoteBuilderPanel />
        </CardContent>
      </Card>
    </div>
  )
}

export { QuoteBuilderPage }

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DESIGN_SYSTEM_STRINGS as S } from './DesignSystemBody.strings'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Typography } from '@/components/ui/typography'
import { Home, Users, Package, Settings, BarChart3, HeadphonesIcon, ShoppingCart, FileText, Search, Plus, Minus, Edit, Trash2, Download, Upload, Eye, EyeOff, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, ChevronsUpDown, Check, X, AlertCircle, AlertTriangle, Info, CheckCircle2, Mail, Phone, MapPin, Calendar, Clock, Star, Heart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, ExternalLink, Copy, Clipboard, Save, Printer, Share2, Send, Lock, Unlock, Shield, Key, Bell, BellOff, Sun, Moon, Monitor, Wifi, WifiOff, Battery, BatteryCharging, Image, Camera, Video, Mic, MicOff, Volume2, VolumeX, Filter, SlidersHorizontal, Menu, Folder, FolderOpen, File, FileCode, FileImage, FileArchive, Database, Server, Cloud, Globe, Zap, Rocket, Target, Flag, Bookmark, Tag, MessageSquare, MessageCircle, Inbox, Archive, Link, Paperclip, CircleDot, Circle, Smile, Frown, Meh, ThumbsUp, ThumbsDown, Award, Crown, Gift, Coffee, Cpu, HardDrive, Smartphone, Tablet, Laptop, Tv, Navigation, Compass, Map, LocateFixed, Scissors, Wrench, PenTool, Palette, Brush, TrendingUp, TrendingDown, PieChart, Activity, BarChart2, LineChart, DollarSign, CreditCard, Wallet, Receipt, ShoppingBag, Truck, Car, Plane, Ship, Train, Building, Building2, Warehouse, Store, Lightbulb, Plug, Power, Maximize2, Minimize2, Move, RotateCw, RotateCcw, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Type, Hash, ListOrdered, List, LayoutGrid, LayoutList, Table, GitBranch, GitCommit, GitMerge, GitPullRequest, GitFork, Terminal, Code, Braces, Binary, UserPlus, UserMinus, UserCheck, UserX, Users2, LogIn, LogOut, UserCircle, Fingerprint, PlayCircle, PauseCircle, StopCircle, SkipForward, SkipBack, Crosshair, ScanLine, QrCode, Barcode, Bug } from 'lucide-react'


// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────
export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-[26px] font-semibold leading-[26px] mb-6">{title}</h2>
      {children}
    </section>
  )
}

// ─────────────────────────────────────────────
// Table of Contents
// ─────────────────────────────────────────────
export const tocItems = [
  { id: 'colors', label: S.toc.items.colors },
  { id: 'typography', label: S.toc.items.typography },
  { id: 'iconography', label: S.toc.items.iconography },
  { id: 'buttons', label: S.toc.items.buttons },
  { id: 'icon-buttons', label: S.toc.items.iconButtons },
  { id: 'inputs', label: S.toc.items.inputs },
  { id: 'floating-labels', label: S.toc.items.floatingLabels },
  { id: 'select', label: S.toc.items.select },
  { id: 'badges', label: S.toc.items.badges },
  { id: 'avatars', label: S.toc.items.avatars },
  { id: 'alerts', label: S.toc.items.alerts },
  { id: 'switches', label: S.toc.items.switches },
  { id: 'checkboxes', label: S.toc.items.checkboxes },
  { id: 'radios', label: S.toc.items.radios },
  { id: 'toggle', label: S.toc.items.toggle },
  { id: 'progress', label: S.toc.items.progress },
  { id: 'rating', label: S.toc.items.rating },
  { id: 'breadcrumb', label: S.toc.items.breadcrumb },
  { id: 'stepper', label: S.toc.items.stepper },
  { id: 'file-upload', label: S.toc.items.fileUpload },
  { id: 'sidenav', label: S.toc.items.sidenav },
  { id: 'profile-dropdown', label: S.toc.items.profileDropdown },
  { id: 'datepicker', label: S.toc.items.datepicker },
]


export function DesignSystemBody() {
  return (
    <div className="flex gap-8 p-6 max-w-[1400px] mx-auto">
      {/* Sticky TOC Sidebar */}
      <nav className="hidden lg:block w-52 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">{S.toc.heading}</p>
        <ul className="space-y-1">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block text-[13px] font-medium text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-12">
        <div>
          <h1 className="text-[38px] font-semibold leading-[38px]">{S.page.title}</h1>
          <p className="text-muted-foreground mt-3 text-[15px] font-medium leading-[16px]">
            {S.page.subtitle}
          </p>
        </div>

        <Separator />

        {/* ══════════════ COLORS ══════════════ */}
        <Section id="colors" title={S.colors.sectionTitle}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            <ColorGroup title={S.colors.groups.primary} colors={[
              { name: S.colors.swatches.primaryMain, hex: '#1379F0' },
              { name: S.colors.swatches.primaryActive, hex: '#086DE3' },
              { name: S.colors.swatches.primaryAccent, hex: '#0D4B94' },
              { name: S.colors.swatches.primaryLight, hex: '#EEF5FF' },
            ]} />
            <ColorGroup title={S.colors.groups.success} colors={[
              { name: S.colors.swatches.successMain, hex: '#50CD89' },
              { name: S.colors.swatches.successActive, hex: '#46BE7D' },
              { name: S.colors.swatches.successAccent, hex: '#0B5C22' },
              { name: S.colors.swatches.successLight, hex: '#E8FFF3' },
            ]} />
            <ColorGroup title={S.colors.groups.danger} colors={[
              { name: S.colors.swatches.dangerMain, hex: '#F1416C' },
              { name: S.colors.swatches.dangerActive, hex: '#D9214E' },
              { name: S.colors.swatches.dangerAccent, hex: '#991930' },
              { name: S.colors.swatches.dangerLight, hex: '#FFF5F8' },
            ]} />
            <ColorGroup title={S.colors.groups.warning} colors={[
              { name: S.colors.swatches.warningMain, hex: '#F6C000' },
              { name: S.colors.swatches.warningActive, hex: '#E8B500' },
              { name: S.colors.swatches.warningAccent, hex: '#B88800' },
              { name: S.colors.swatches.warningLight, hex: '#FFF8DD' },
            ]} />
            <ColorGroup title={S.colors.groups.info} colors={[
              { name: S.colors.swatches.infoMain, hex: '#7239EA' },
              { name: S.colors.swatches.infoActive, hex: '#5014D0' },
              { name: S.colors.swatches.infoAccent, hex: '#271086' },
              { name: S.colors.swatches.infoLight, hex: '#F8F5FF' },
            ]} />
            <ColorGroup title={S.colors.groups.gray} colors={[
              { name: S.colors.swatches.gray100, hex: '#F1F1F2' },
              { name: S.colors.swatches.gray200, hex: '#E0E2E9' },
              { name: S.colors.swatches.gray300, hex: '#D8D8E5' },
              { name: S.colors.swatches.gray400, hex: '#A1A5B7' },
              { name: S.colors.swatches.gray500, hex: '#7E8299' },
              { name: S.colors.swatches.gray600, hex: '#5E6278' },
              { name: S.colors.swatches.gray700, hex: '#3F4254' },
              { name: S.colors.swatches.gray800, hex: '#181C32' },
            ]} />
            <ColorGroup title={S.colors.groups.base} colors={[
              { name: S.colors.swatches.baseWhite, hex: '#FFFFFF' },
              { name: S.colors.swatches.baseBackground, hex: '#F9F9F9' },
              { name: S.colors.swatches.baseDark, hex: '#181C32' },
            ]} />
          </div>
        </Section>

        <Separator />

        {/* ══════════════ TYPOGRAPHY ══════════════ */}
        <Section id="typography" title={S.typography.sectionTitle}>
          <Card>
            <CardHeader>
              <CardTitle>{S.typography.fontName}</CardTitle>
              <p className="text-muted-foreground text-sm">{S.typography.fontDescription}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Font preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6 text-center">
                <p className="text-[80px] font-bold leading-[80px] text-info">{S.typography.fontDisplayWord}</p>
                <p className="text-[26px] font-bold mt-4">{S.typography.fontPangramSentence}</p>
                <p className="text-[18px] font-medium mt-3 text-muted-foreground">
                  {S.typography.fontAlphabet}
                </p>
                <p className="text-[16px] font-medium mt-2 text-muted-foreground">{S.typography.fontDigits}</p>
                <p className="text-[14px] font-medium mt-1 text-muted-foreground">{S.typography.fontSymbols}</p>
              </div>

              {/* Typography scale table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">{S.typography.tableHeaders.name}</th>
                      <th className="text-left px-4 py-2.5 font-semibold">{S.typography.tableHeaders.preview}</th>
                      <th className="text-left px-4 py-2.5 font-semibold">{S.typography.tableHeaders.weight}</th>
                      <th className="text-left px-4 py-2.5 font-semibold">{S.typography.tableHeaders.size}</th>
                      <th className="text-left px-4 py-2.5 font-semibold">{S.typography.tableHeaders.lineHeight}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { name: S.typography.scaleNames[0], weight: 700, size: 50, lh: 54 },
                      { name: S.typography.scaleNames[1], weight: 700, size: 44, lh: 56 },
                      { name: S.typography.scaleNames[2], weight: 600, size: 38, lh: 38 },
                      { name: S.typography.scaleNames[3], weight: 600, size: 34, lh: 34 },
                      { name: S.typography.scaleNames[4], weight: 600, size: 30, lh: 30 },
                      { name: S.typography.scaleNames[5], weight: 600, size: 26, lh: 26 },
                      { name: S.typography.scaleNames[6], weight: 600, size: 24, lh: 24 },
                      { name: S.typography.scaleNames[7], weight: 500, size: 22, lh: 38 },
                      { name: S.typography.scaleNames[8], weight: 600, size: 22, lh: 22 },
                      { name: S.typography.scaleNames[9], weight: 600, size: 20, lh: 20 },
                      { name: S.typography.scaleNames[10], weight: 500, size: 20, lh: 30 },
                      { name: S.typography.scaleNames[11], weight: 500, size: 18, lh: 30 },
                      { name: S.typography.scaleNames[12], weight: 600, size: 18, lh: 18 },
                      { name: S.typography.scaleNames[13], weight: 500, size: 16, lh: 16 },
                      { name: S.typography.scaleNames[14], weight: 600, size: 16, lh: 16 },
                      { name: S.typography.scaleNames[15], weight: 500, size: 15, lh: 16 },
                      { name: S.typography.scaleNames[16], weight: 600, size: 15, lh: 16 },
                      { name: S.typography.scaleNames[17], weight: 500, size: 14, lh: 14 },
                      { name: S.typography.scaleNames[18], weight: 600, size: 14, lh: 14 },
                      { name: S.typography.scaleNames[19], weight: 700, size: 14, lh: 14 },
                      { name: S.typography.scaleNames[20], weight: 600, size: 13, lh: 14 },
                      { name: S.typography.scaleNames[21], weight: 700, size: 13, lh: 14 },
                      { name: S.typography.scaleNames[22], weight: 500, size: 12, lh: 12 },
                      { name: S.typography.scaleNames[23], weight: 600, size: 12, lh: 12 },
                      { name: S.typography.scaleNames[24], weight: 700, size: 12, lh: 12 },
                      { name: S.typography.scaleNames[25], weight: 600, size: 11, lh: 11 },
                      { name: S.typography.scaleNames[26], weight: 600, size: 10, lh: 10 },
                      { name: S.typography.scaleNames[27], weight: 600, size: 9, lh: 9 },
                    ].map((t) => (
                      <tr key={t.name} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.name}</td>
                        <td className="px-4 py-2">
                          <span style={{ fontSize: Math.min(t.size, 30), fontWeight: t.weight, lineHeight: `${Math.min(t.lh, 34)}px` }}>
                            {t.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{t.weight === 500 ? S.typography.weightLabels.medium : t.weight === 600 ? S.typography.weightLabels.semiBold : S.typography.weightLabels.bold} ({t.weight})</td>
                        <td className="px-4 py-2 text-muted-foreground">{t.size}{S.typography.pxSuffix}</td>
                        <td className="px-4 py-2 text-muted-foreground">{t.lh}{S.typography.pxSuffix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ ICONOGRAPHY ══════════════ */}
        <Section id="iconography" title={S.iconography.sectionTitle}>
          <Typography tone="muted" className="mb-4">{S.iconography.description}</Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <IconCategory title={S.iconography.categories.general} icons={[
              { Icon: Home, name: 'home' }, { Icon: Search, name: 'search' }, { Icon: Menu, name: 'menu' },
              { Icon: Settings, name: 'settings' }, { Icon: Bell, name: 'bell' }, { Icon: Star, name: 'star' },
              { Icon: Heart, name: 'heart' }, { Icon: Eye, name: 'eye' }, { Icon: EyeOff, name: 'eye-off' },
              { Icon: Filter, name: 'filter' }, { Icon: SlidersHorizontal, name: 'sliders' }, { Icon: Tag, name: 'tag' },
              { Icon: Bookmark, name: 'bookmark' }, { Icon: Flag, name: 'flag' }, { Icon: Zap, name: 'zap' },
              { Icon: Rocket, name: 'rocket' }, { Icon: Target, name: 'target' }, { Icon: Crown, name: 'crown' },
              { Icon: Gift, name: 'gift' }, { Icon: Coffee, name: 'coffee' }, { Icon: Lightbulb, name: 'lightbulb' },
              { Icon: Smile, name: 'smile' }, { Icon: Frown, name: 'frown' }, { Icon: Meh, name: 'meh' },
            ]} />
            <IconCategory title={S.iconography.categories.actions} icons={[
              { Icon: Plus, name: 'plus' }, { Icon: Minus, name: 'minus' }, { Icon: Edit, name: 'edit' },
              { Icon: Trash2, name: 'trash' }, { Icon: Download, name: 'download' }, { Icon: Upload, name: 'upload' },
              { Icon: Copy, name: 'copy' }, { Icon: Clipboard, name: 'clipboard' }, { Icon: Save, name: 'save' },
              { Icon: Printer, name: 'printer' }, { Icon: Share2, name: 'share' }, { Icon: Send, name: 'send' },
              { Icon: RefreshCw, name: 'refresh' }, { Icon: ExternalLink, name: 'external-link' }, { Icon: Link, name: 'link' },
              { Icon: Paperclip, name: 'paperclip' }, { Icon: Check, name: 'check' }, { Icon: X, name: 'close' },
              { Icon: LogIn, name: 'log-in' }, { Icon: LogOut, name: 'log-out' }, { Icon: Lock, name: 'lock' },
              { Icon: Unlock, name: 'unlock' }, { Icon: ThumbsUp, name: 'thumbs-up' }, { Icon: ThumbsDown, name: 'thumbs-down' },
            ]} />
            <IconCategory title={S.iconography.categories.navigationArrows} icons={[
              { Icon: ArrowUp, name: 'arrow-up' }, { Icon: ArrowDown, name: 'arrow-down' },
              { Icon: ArrowLeft, name: 'arrow-left' }, { Icon: ArrowRight, name: 'arrow-right' },
              { Icon: ChevronUp, name: 'chevron-up' }, { Icon: ChevronDown, name: 'chevron-down' },
              { Icon: ChevronLeft, name: 'chevron-left' }, { Icon: ChevronRight, name: 'chevron-right' },
              { Icon: ChevronsUpDown, name: 'chevrons-up-down' }, { Icon: Maximize2, name: 'maximize' },
              { Icon: Minimize2, name: 'minimize' }, { Icon: Move, name: 'move' },
              { Icon: RotateCw, name: 'rotate-cw' }, { Icon: RotateCcw, name: 'rotate-ccw' },
              { Icon: Navigation, name: 'navigation' }, { Icon: Compass, name: 'compass' },
              { Icon: Map, name: 'map' }, { Icon: LocateFixed, name: 'locate' },
            ]} />
            <IconCategory title={S.iconography.categories.communication} icons={[
              { Icon: Mail, name: 'mail' }, { Icon: Phone, name: 'phone' }, { Icon: MessageSquare, name: 'message' },
              { Icon: MessageCircle, name: 'message-circle' }, { Icon: Inbox, name: 'inbox' }, { Icon: Archive, name: 'archive' },
              { Icon: BellOff, name: 'bell-off' }, { Icon: Mic, name: 'mic' }, { Icon: MicOff, name: 'mic-off' },
              { Icon: Volume2, name: 'volume' }, { Icon: VolumeX, name: 'volume-x' }, { Icon: Video, name: 'video' },
            ]} />
            <IconCategory title={S.iconography.categories.filesDocuments} icons={[
              { Icon: File, name: 'file' }, { Icon: FileText, name: 'file-text' }, { Icon: FileCode, name: 'file-code' },
              { Icon: FileImage, name: 'file-image' }, { Icon: FileArchive, name: 'file-archive' },
              { Icon: Folder, name: 'folder' }, { Icon: FolderOpen, name: 'folder-open' },
              { Icon: Image, name: 'image' }, { Icon: Camera, name: 'camera' },
            ]} />
            <IconCategory title={S.iconography.categories.usersPeople} icons={[
              { Icon: Users, name: 'users' }, { Icon: Users2, name: 'users-2' }, { Icon: UserPlus, name: 'user-plus' },
              { Icon: UserMinus, name: 'user-minus' }, { Icon: UserCheck, name: 'user-check' }, { Icon: UserX, name: 'user-x' },
              { Icon: UserCircle, name: 'user-circle' }, { Icon: Fingerprint, name: 'fingerprint' },
              { Icon: Shield, name: 'shield' }, { Icon: Key, name: 'key' },
            ]} />
            <IconCategory title={S.iconography.categories.chartsData} icons={[
              { Icon: BarChart3, name: 'bar-chart' }, { Icon: BarChart2, name: 'bar-chart-2' },
              { Icon: LineChart, name: 'line-chart' }, { Icon: PieChart, name: 'pie-chart' },
              { Icon: TrendingUp, name: 'trending-up' }, { Icon: TrendingDown, name: 'trending-down' },
              { Icon: Activity, name: 'activity' }, { Icon: Table, name: 'table' },
            ]} />
            <IconCategory title={S.iconography.categories.devicesTech} icons={[
              { Icon: Smartphone, name: 'smartphone' }, { Icon: Tablet, name: 'tablet' }, { Icon: Laptop, name: 'laptop' },
              { Icon: Tv, name: 'tv' }, { Icon: Cpu, name: 'cpu' }, { Icon: HardDrive, name: 'hard-drive' },
              { Icon: Database, name: 'database' }, { Icon: Server, name: 'server' }, { Icon: Cloud, name: 'cloud' },
              { Icon: Globe, name: 'globe' }, { Icon: Wifi, name: 'wifi' }, { Icon: WifiOff, name: 'wifi-off' },
              { Icon: Battery, name: 'battery' }, { Icon: BatteryCharging, name: 'battery-charging' },
              { Icon: Plug, name: 'plug' }, { Icon: Power, name: 'power' },
            ]} />
            <IconCategory title={S.iconography.categories.commerce} icons={[
              { Icon: ShoppingCart, name: 'cart' }, { Icon: ShoppingBag, name: 'bag' },
              { Icon: DollarSign, name: 'dollar' }, { Icon: CreditCard, name: 'credit-card' },
              { Icon: Wallet, name: 'wallet' }, { Icon: Receipt, name: 'receipt' },
              { Icon: Store, name: 'store' }, { Icon: Building, name: 'building' },
              { Icon: Building2, name: 'building-2' }, { Icon: Warehouse, name: 'warehouse' },
            ]} />
            <IconCategory title={S.iconography.categories.designEditor} icons={[
              { Icon: PenTool, name: 'pen-tool' }, { Icon: Palette, name: 'palette' }, { Icon: Brush, name: 'brush' },
              { Icon: Scissors, name: 'scissors' }, { Icon: Type, name: 'type' },
              { Icon: Bold, name: 'bold' }, { Icon: Italic, name: 'italic' }, { Icon: Underline, name: 'underline' },
              { Icon: AlignLeft, name: 'align-left' }, { Icon: AlignCenter, name: 'align-center' },
              { Icon: AlignRight, name: 'align-right' }, { Icon: AlignJustify, name: 'align-justify' },
              { Icon: LayoutGrid, name: 'layout-grid' }, { Icon: LayoutList, name: 'layout-list' },
              { Icon: List, name: 'list' }, { Icon: ListOrdered, name: 'list-ordered' },
            ]} />
            <IconCategory title={S.iconography.categories.development} icons={[
              { Icon: Code, name: 'code' }, { Icon: Terminal, name: 'terminal' }, { Icon: Braces, name: 'braces' },
              { Icon: Binary, name: 'binary' }, { Icon: Hash, name: 'hash' },
              { Icon: GitBranch, name: 'git-branch' }, { Icon: GitCommit, name: 'git-commit' },
              { Icon: GitMerge, name: 'git-merge' }, { Icon: GitPullRequest, name: 'git-pr' },
              { Icon: GitFork, name: 'github' }, { Icon: Bug, name: 'bug' },
            ]} />
            <IconCategory title={S.iconography.categories.transport} icons={[
              { Icon: Truck, name: 'truck' }, { Icon: Car, name: 'car' }, { Icon: Plane, name: 'plane' },
              { Icon: Ship, name: 'ship' }, { Icon: Train, name: 'train' }, { Icon: MapPin, name: 'map-pin' },
            ]} />
            <IconCategory title={S.iconography.categories.statusAlerts} icons={[
              { Icon: AlertCircle, name: 'alert-circle' }, { Icon: AlertTriangle, name: 'alert-triangle' },
              { Icon: Info, name: 'info' }, { Icon: CheckCircle2, name: 'check-circle' },
              { Icon: CircleDot, name: 'circle-dot' }, { Icon: Circle, name: 'circle' },
              { Icon: Award, name: 'award' }, { Icon: Crosshair, name: 'crosshair' },
              { Icon: ScanLine, name: 'scan' }, { Icon: QrCode, name: 'qr-code' }, { Icon: Barcode, name: 'barcode' },
            ]} />
            <IconCategory title={S.iconography.categories.media} icons={[
              { Icon: PlayCircle, name: 'play' }, { Icon: PauseCircle, name: 'pause' },
              { Icon: StopCircle, name: 'stop' }, { Icon: SkipForward, name: 'skip-fwd' },
              { Icon: SkipBack, name: 'skip-back' }, { Icon: Sun, name: 'sun' },
              { Icon: Moon, name: 'moon' }, { Icon: Monitor, name: 'monitor' },
            ]} />
          </div>
        </Section>

        <Separator />

        {/* ══════════════ BUTTONS ══════════════ */}
        <Section id="buttons" title={S.buttons.sectionTitle}>
          {/* Solid */}
          <Card className="mb-6">
            <CardHeader><CardTitle>{S.buttons.solidCardTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.allColors}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button>{S.buttons.labels.primary}</Button>
                  <Button variant="success">{S.buttons.labels.success}</Button>
                  <Button variant="destructive">{S.buttons.labels.danger}</Button>
                  <Button variant="info">{S.buttons.labels.info}</Button>
                  <Button variant="warning">{S.buttons.labels.warning}</Button>
                  <Button variant="secondary">{S.buttons.labels.grey}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.sizes}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="lg">{S.buttons.labels.large}</Button>
                  <Button>{S.buttons.labels.default}</Button>
                  <Button size="sm">{S.buttons.labels.small}</Button>
                  <Button size="xs">{S.buttons.labels.xs}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.roundedShape}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button shape="rounded">{S.buttons.labels.primary}</Button>
                  <Button variant="success" shape="rounded">{S.buttons.labels.success}</Button>
                  <Button variant="destructive" shape="rounded">{S.buttons.labels.danger}</Button>
                  <Button variant="info" shape="rounded">{S.buttons.labels.info}</Button>
                  <Button variant="warning" shape="rounded">{S.buttons.labels.warning}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.withIcons}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button><Plus data-icon="inline-start" className="size-4" /> {S.buttons.labels.addNew}</Button>
                  <Button variant="success"><Check data-icon="inline-start" className="size-4" /> {S.buttons.labels.approve}</Button>
                  <Button variant="destructive"><Trash2 data-icon="inline-start" className="size-4" /> {S.buttons.labels.delete}</Button>
                  <Button variant="info"><Download data-icon="inline-start" className="size-4" /> {S.buttons.labels.download}</Button>
                  <Button variant="warning"><AlertTriangle data-icon="inline-start" className="size-4" /> {S.buttons.labels.warningBtn}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.states}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button>{S.buttons.labels.normal}</Button>
                  <Button disabled>{S.buttons.labels.disabled}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Light */}
          <Card className="mb-6">
            <CardHeader><CardTitle>{S.buttons.lightCardTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary-light">{S.buttons.labels.primary}</Button>
                <Button variant="success-light">{S.buttons.labels.success}</Button>
                <Button variant="danger-light">{S.buttons.labels.danger}</Button>
                <Button variant="info-light">{S.buttons.labels.info}</Button>
                <Button variant="warning-light">{S.buttons.labels.warning}</Button>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.withIcons}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary-light"><Plus data-icon="inline-start" className="size-4" /> {S.buttons.labels.add}</Button>
                  <Button variant="success-light"><Check data-icon="inline-start" className="size-4" /> {S.buttons.labels.done}</Button>
                  <Button variant="danger-light"><X data-icon="inline-start" className="size-4" /> {S.buttons.labels.cancel}</Button>
                  <Button variant="info-light"><Info data-icon="inline-start" className="size-4" /> {S.buttons.labels.infoBtn}</Button>
                  <Button variant="warning-light"><AlertTriangle data-icon="inline-start" className="size-4" /> {S.buttons.labels.warn}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.buttons.groups.allSizes}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary-light" size="lg">{S.buttons.labels.large}</Button>
                  <Button variant="primary-light">{S.buttons.labels.default}</Button>
                  <Button variant="primary-light" size="sm">{S.buttons.labels.small}</Button>
                  <Button variant="primary-light" size="xs">{S.buttons.labels.xs}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tertiary */}
          <Card className="mb-6">
            <CardHeader><CardTitle>{S.buttons.tertiaryCardTitle}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary-tertiary">{S.buttons.labels.primary}</Button>
                <Button variant="success-tertiary">{S.buttons.labels.success}</Button>
                <Button variant="danger-tertiary">{S.buttons.labels.danger}</Button>
                <Button variant="info-tertiary">{S.buttons.labels.info}</Button>
                <Button variant="warning-tertiary">{S.buttons.labels.warning}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Other */}
          <Card>
            <CardHeader><CardTitle>{S.buttons.otherCardTitle}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline">{S.buttons.labels.outline}</Button>
                <Button variant="ghost">{S.buttons.labels.ghost}</Button>
                <Button variant="link">{S.buttons.labels.link}</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ ICON BUTTONS ══════════════ */}
        <Section id="icon-buttons" title={S.iconButtons.sectionTitle}>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.iconButtons.groups.solidSquare}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="secondary"><Plus /></Button>
                  <Button size="icon"><Plus /></Button>
                  <Button size="icon" variant="success"><Plus /></Button>
                  <Button size="icon" variant="destructive"><Plus /></Button>
                  <Button size="icon" variant="info"><Plus /></Button>
                  <Button size="icon" variant="warning"><Plus /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.iconButtons.groups.solidRounded}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="secondary" shape="rounded"><Plus /></Button>
                  <Button size="icon" shape="rounded"><Plus /></Button>
                  <Button size="icon" variant="success" shape="rounded"><Plus /></Button>
                  <Button size="icon" variant="destructive" shape="rounded"><Plus /></Button>
                  <Button size="icon" variant="info" shape="rounded"><Plus /></Button>
                  <Button size="icon" variant="warning" shape="rounded"><Plus /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.iconButtons.groups.light}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="primary-light"><Plus /></Button>
                  <Button size="icon" variant="success-light"><Check /></Button>
                  <Button size="icon" variant="danger-light"><X /></Button>
                  <Button size="icon" variant="info-light"><Info /></Button>
                  <Button size="icon" variant="warning-light"><AlertTriangle /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.iconButtons.groups.tertiary}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="primary-tertiary"><Plus /></Button>
                  <Button size="icon" variant="success-tertiary"><Check /></Button>
                  <Button size="icon" variant="danger-tertiary"><X /></Button>
                  <Button size="icon" variant="info-tertiary"><Info /></Button>
                  <Button size="icon" variant="warning-tertiary"><AlertTriangle /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.iconButtons.groups.sizes}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon-lg"><Plus /></Button>
                  <Button size="icon"><Plus /></Button>
                  <Button size="icon-sm"><Plus /></Button>
                  <Button size="icon-xs"><Plus /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ INPUTS ══════════════ */}
        <Section id="inputs" title={S.inputs.sectionTitle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{S.inputs.stylesCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.outline}</Label><Input variant="outline" placeholder={S.inputs.placeholders.enterText} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.solid}</Label><Input variant="solid" placeholder={S.inputs.placeholders.enterText} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.tertiary}</Label><Input variant="tertiary" placeholder={S.inputs.placeholders.enterText} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.white}</Label><Input variant="white" placeholder={S.inputs.placeholders.enterText} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.inputs.sizesCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.large}</Label><Input inputSize="lg" placeholder={S.inputs.placeholders.largeInput} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.medium}</Label><Input inputSize="default" placeholder={S.inputs.placeholders.mediumInput} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.small}</Label><Input inputSize="sm" placeholder={S.inputs.placeholders.smallInput} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.inputs.typesCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.textField}</Label><Input placeholder={S.inputs.placeholders.textField} /></div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.search}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-10" placeholder={S.inputs.placeholders.search} />
                  </div>
                </div>
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.disabled}</Label><Input disabled placeholder={S.inputs.placeholders.disabledInput} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.inputs.statesCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.defaultState}</Label><Input placeholder={S.inputs.placeholders.defaultState} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium text-success">{S.inputs.labels.success}</Label><Input className="border-success focus-visible:border-success focus-visible:ring-success/30" placeholder={S.inputs.placeholders.validInput} /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium text-destructive">{S.inputs.labels.error}</Label><Input className="border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30" placeholder={S.inputs.placeholders.invalidInput} /></div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.withHelperText}</Label>
                  <Input placeholder={S.inputs.placeholders.enterEmail} />
                  <Typography asChild variant="helper" className="mt-1"><p>{S.inputs.helperText}</p></Typography>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.inputs.labels.required} <span className="text-destructive">{S.inputs.requiredAsterisk}</span></Label>
                  <Input placeholder={S.inputs.placeholders.requiredField} />
                  <p className="text-xs text-destructive mt-1">{S.inputs.requiredFieldError}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ FLOATING LABELS ══════════════ */}
        <Section id="floating-labels" title={S.floatingLabels.sectionTitle}>
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FloatingLabelInput label={S.floatingLabels.outlineLabel} variant="outline" />
              <FloatingLabelInput label={S.floatingLabels.solidLabel} variant="solid" />
              <FloatingLabelInput label={S.floatingLabels.tertiaryLabel} variant="tertiary" />
              <FloatingLabelInput label={S.floatingLabels.textareaLabel} variant="outline" isTextarea />
              <FloatingLabelInput label={S.floatingLabels.successLabel} variant="outline" state="success" />
              <FloatingLabelInput label={S.floatingLabels.errorLabel} variant="outline" state="error" />
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ SELECT ══════════════ */}
        <Section id="select" title={S.select.sectionTitle}>
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">{S.select.labels.outline}</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-input bg-transparent px-3 pr-8 text-sm outline-none appearance-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                    <option>{S.select.placeholders.selectOption}</option>
                    <option>{S.select.placeholders.option1}</option>
                    <option>{S.select.placeholders.option2}</option>
                    <option>{S.select.placeholders.option3}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">{S.select.labels.solid}</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-transparent bg-gray-100 dark:bg-gray-870 px-3 pr-8 text-sm outline-none appearance-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                    <option>{S.select.placeholders.selectOption}</option>
                    <option>{S.select.placeholders.option1}</option>
                    <option>{S.select.placeholders.option2}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">{S.select.labels.disabled}</Label>
                <div className="relative">
                  <select disabled className="w-full h-10 rounded-md border border-input bg-transparent px-3 pr-8 text-sm outline-none appearance-none opacity-50 cursor-not-allowed">
                    <option>{S.select.placeholders.disabled}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium text-destructive">{S.select.labels.invalid}</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-destructive bg-transparent px-3 pr-8 text-sm outline-none appearance-none ring-3 ring-destructive/20">
                    <option>{S.select.placeholders.invalidSelection}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-destructive mt-1">{S.select.invalidError}</p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ BADGES ══════════════ */}
        <Section id="badges" title={S.badges.sectionTitle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{S.badges.solidCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.pillShape}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{S.badges.labels.primary}</Badge>
                    <Badge variant="success">{S.badges.labels.success}</Badge>
                    <Badge variant="destructive">{S.badges.labels.danger}</Badge>
                    <Badge variant="info">{S.badges.labels.info}</Badge>
                    <Badge variant="warning">{S.badges.labels.warning}</Badge>
                    <Badge variant="grey">{S.badges.labels.grey}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.roundedShape}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge shape="rounded">{S.badges.labels.primary}</Badge>
                    <Badge variant="success" shape="rounded">{S.badges.labels.success}</Badge>
                    <Badge variant="destructive" shape="rounded">{S.badges.labels.danger}</Badge>
                    <Badge variant="info" shape="rounded">{S.badges.labels.info}</Badge>
                    <Badge variant="warning" shape="rounded">{S.badges.labels.warning}</Badge>
                    <Badge variant="grey" shape="rounded">{S.badges.labels.grey}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.sizes}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge size="sm">{S.badges.labels.small}</Badge>
                    <Badge size="default">{S.badges.labels.medium}</Badge>
                    <Badge size="lg">{S.badges.labels.large}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.badges.softCardTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.pillShape}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary-soft">{S.badges.labels.primary}</Badge>
                    <Badge variant="success-soft">{S.badges.labels.success}</Badge>
                    <Badge variant="danger-soft">{S.badges.labels.danger}</Badge>
                    <Badge variant="info-soft">{S.badges.labels.info}</Badge>
                    <Badge variant="warning-soft">{S.badges.labels.warning}</Badge>
                    <Badge variant="grey-soft">{S.badges.labels.grey}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.roundedShape}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary-soft" shape="rounded">{S.badges.labels.primary}</Badge>
                    <Badge variant="success-soft" shape="rounded">{S.badges.labels.success}</Badge>
                    <Badge variant="danger-soft" shape="rounded">{S.badges.labels.danger}</Badge>
                    <Badge variant="info-soft" shape="rounded">{S.badges.labels.info}</Badge>
                    <Badge variant="warning-soft" shape="rounded">{S.badges.labels.warning}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{S.badges.groups.otherVariants}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{S.badges.labels.outline}</Badge>
                    <Badge variant="secondary">{S.badges.labels.secondary}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ AVATARS ══════════════ */}
        <Section id="avatars" title={S.avatars.sectionTitle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{S.avatars.sizesCircleTitle}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  {(['24', '28', '34', '40', '60', '80', '100'] as const).map((s) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <Avatar size={s}><AvatarFallback>A</AvatarFallback></Avatar>
                      <span className="text-[10px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.avatars.sizesRoundedTitle}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  {(['24', '28', '34', '40', '60', '80', '100'] as const).map((s) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <Avatar size={s} shape="rounded"><AvatarFallback>A</AvatarFallback></Avatar>
                      <span className="text-[10px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.avatars.statusBadgesTitle}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {S.avatars.statusValues.map((st) => (
                    <div key={st} className="flex flex-col items-center gap-1">
                      <Avatar size="40"><AvatarFallback>{st[0].toUpperCase()}{st[1].toUpperCase()}</AvatarFallback><AvatarBadge status={st} /></Avatar>
                      <span className="text-[10px] text-muted-foreground capitalize">{st}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{S.avatars.letterTypesTitle}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback>AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">{S.avatars.letterTypeLabels.light}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-info text-white">AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">{S.avatars.letterTypeLabels.contrast}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-transparent border-2 border-info text-info">AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">{S.avatars.letterTypeLabels.outline}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-info-soft text-info"><Users className="size-5" /></AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">{S.avatars.letterTypeLabels.lightIcon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ ALERTS ══════════════ */}
        <Section id="alerts" title={S.alerts.sectionTitle}>
          <div className="space-y-4">
            {[
              { color: S.alerts.colors.primary, ...S.alerts.palette.primary, icon: <Info className="size-5" /> },
              { color: S.alerts.colors.success, ...S.alerts.palette.success, icon: <CheckCircle2 className="size-5" /> },
              { color: S.alerts.colors.danger, ...S.alerts.palette.danger, icon: <AlertCircle className="size-5" /> },
              { color: S.alerts.colors.warning, ...S.alerts.palette.warning, icon: <AlertTriangle className="size-5" /> },
              { color: S.alerts.colors.info, ...S.alerts.palette.info, icon: <Info className="size-5" /> },
            ].map(({ color, bg, border, text, icon }) => (
              <div key={color}>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{color}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Light */}
                  <div className="rounded-md p-4 flex items-start gap-3" style={{ backgroundColor: bg, color: text }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">{S.alerts.title}</p>
                      <p className="text-xs mt-0.5 opacity-80">{S.alerts.lightBody}</p>
                    </div>
                  </div>
                  {/* Solid */}
                  <div className="rounded-md p-4 flex items-start gap-3 text-white" style={{ backgroundColor: border }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">{S.alerts.title}</p>
                      <p className="text-xs mt-0.5 opacity-80">{S.alerts.solidBody}</p>
                    </div>
                  </div>
                  {/* Outline */}
                  <div className="rounded-md p-4 flex items-start gap-3 border-2 bg-white dark:bg-transparent" style={{ borderColor: border, color: text }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">{S.alerts.title}</p>
                      <p className="text-xs mt-0.5 opacity-80">{S.alerts.outlineBody}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        {/* ══════════════ SWITCHES ══════════════ */}
        <Section id="switches" title={S.switches.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.switches.groups.large}</p>
                  <div className="flex items-center gap-3"><Switch /><Label>{S.switches.labels.default}</Label></div>
                  <div className="flex items-center gap-3"><Switch defaultChecked /><Label>{S.switches.labels.checked}</Label></div>
                  <div className="flex items-center gap-3"><Switch disabled /><Label>{S.switches.labels.disabled}</Label></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.switches.groups.small}</p>
                  <div className="flex items-center gap-3"><Switch size="sm" /><Label>{S.switches.labels.default}</Label></div>
                  <div className="flex items-center gap-3"><Switch size="sm" defaultChecked /><Label>{S.switches.labels.checked}</Label></div>
                  <div className="flex items-center gap-3"><Switch size="sm" disabled /><Label>{S.switches.labels.disabled}</Label></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ CHECKBOXES ══════════════ */}
        <Section id="checkboxes" title={S.checkboxes.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.checkboxes.groups.withoutLabel}</p>
                  <div className="flex items-center gap-4">
                    <Checkbox />
                    <Checkbox defaultChecked />
                    <Checkbox disabled />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.checkboxes.groups.withLabel}</p>
                  <div className="flex items-center gap-3"><Checkbox /><Label className="text-[13px] font-medium">{S.checkboxes.labels.default}</Label></div>
                  <div className="flex items-center gap-3"><Checkbox defaultChecked /><Label className="text-[13px] font-medium">{S.checkboxes.labels.checked}</Label></div>
                  <div className="flex items-center gap-3"><Checkbox disabled /><Label className="text-[13px] font-medium text-muted-foreground">{S.checkboxes.labels.disabled}</Label></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ RADIOS ══════════════ */}
        <Section id="radios" title={S.radios.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.radios.groups.large}</p>
                  <RadioGroup defaultValue="r1">
                    <div className="flex items-center gap-3"><RadioGroupItem value="r1" /><Label className="text-[13px] font-medium">{S.radios.labels.default}</Label></div>
                    <div className="flex items-center gap-3"><RadioGroupItem value="r2" /><Label className="text-[13px] font-medium">{S.radios.labels.checked}</Label></div>
                    <div className="flex items-center gap-3"><RadioGroupItem value="r3" disabled /><Label className="text-[13px] font-medium text-muted-foreground">{S.radios.labels.disabled}</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.radios.groups.withoutLabel}</p>
                  <RadioGroup defaultValue="r4" className="flex gap-4">
                    <RadioGroupItem value="r4" />
                    <RadioGroupItem value="r5" />
                    <RadioGroupItem value="r6" disabled />
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ TOGGLE ══════════════ */}
        <Section id="toggle" title={S.toggle.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <ToggleDemo />
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ PROGRESS ══════════════ */}
        <Section id="progress" title={S.progress.sectionTitle}>
          <Card>
            <CardHeader><CardTitle>{S.progress.linearCardTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {S.progress.bars.map(({ color, value, label }) => (
                <Progress key={color} value={value} color={color}>
                  <ProgressLabel>{label}</ProgressLabel>
                  <ProgressValue>{() => `${value}%`}</ProgressValue>
                </Progress>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ RATING ══════════════ */}
        <Section id="rating" title={S.rating.sectionTitle}>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.rating.groups.star}</p>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1, 0].map((rated) => (
                    <div key={rated} className="flex items-center gap-2">
                      <RatingStars value={rated} max={5} type="star" />
                      <Typography asChild variant="helper"><span>({rated}/5)</span></Typography>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.rating.groups.heart}</p>
                <div className="space-y-3">
                  {[5, 3, 1].map((rated) => (
                    <div key={rated} className="flex items-center gap-2">
                      <RatingStars value={rated} max={5} type="heart" />
                      <Typography asChild variant="helper"><span>({rated}/5)</span></Typography>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.rating.groups.emoji}</p>
                <div className="flex gap-4">
                  <RatingStars value={1} max={5} type="emoji" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ BREADCRUMB ══════════════ */}
        <Section id="breadcrumb" title={S.breadcrumb.sectionTitle}>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.breadcrumb.groups.full}</p>
                <nav className="flex items-center gap-2 text-[13px]">
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{S.breadcrumb.links.home}</a>
                  <span className="text-muted-foreground">{S.breadcrumb.separator}</span>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{S.breadcrumb.links.account}</a>
                  <span className="text-muted-foreground">{S.breadcrumb.separator}</span>
                  <span className="text-foreground font-medium">{S.breadcrumb.links.overview}</span>
                </nav>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.breadcrumb.groups.light}</p>
                <nav className="flex items-center gap-2 text-[13px]">
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{S.breadcrumb.links.home}</a>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{S.breadcrumb.links.settings}</a>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <span className="text-foreground font-medium">{S.breadcrumb.links.profile}</span>
                </nav>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.breadcrumb.groups.darkMode}</p>
                <div className="bg-gray-950 rounded-lg p-4">
                  <nav className="flex items-center gap-2 text-[13px]">
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">{S.breadcrumb.links.home}</a>
                    <span className="text-muted-foreground">{S.breadcrumb.separator}</span>
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">{S.breadcrumb.links.dashboard}</a>
                    <span className="text-muted-foreground">{S.breadcrumb.separator}</span>
                    <span className="text-white font-medium">{S.breadcrumb.links.analytics}</span>
                  </nav>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ STEPPER ══════════════ */}
        <Section id="stepper" title={S.stepper.sectionTitle}>
          <Card>
            <CardContent className="p-6 space-y-8">
              <StepperDemo activeStep={1} />
              <Separator />
              <StepperDemo activeStep={2} />
              <Separator />
              <StepperDemo activeStep={3} />
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ FILE UPLOAD ══════════════ */}
        <Section id="file-upload" title={S.fileUpload.sectionTitle}>
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-info transition-colors cursor-pointer">
                <Upload className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-[13px] font-medium">{S.fileUpload.defaultTitle}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{S.fileUpload.defaultHint}</p>
                <Button variant="primary-light" size="sm" className="mt-4">{S.fileUpload.browseCta}</Button>
              </div>
              {/* With file selected */}
              <div className="border-2 border-dashed border-success rounded-lg p-8 text-center">
                <CheckCircle2 className="size-10 mx-auto text-success mb-3" />
                <p className="text-[13px] font-medium">{S.fileUpload.uploadedFileName}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{S.fileUpload.uploadedFileInfo}</p>
                <Button variant="danger-light" size="sm" className="mt-4"><X className="size-3" /> {S.fileUpload.removeLabel}</Button>
              </div>
              {/* Compact */}
              <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4">
                <div className="size-12 rounded-lg bg-info-soft flex items-center justify-center shrink-0">
                  <Upload className="size-5 text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{S.fileUpload.compactTitle}</p>
                  <p className="text-[11px] text-muted-foreground">{S.fileUpload.compactHint}</p>
                </div>
                <Button variant="primary-light" size="xs">{S.fileUpload.uploadCta}</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ SIDENAV ══════════════ */}
        <Section id="sidenav" title={S.sidenav.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Light Sidebar */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-white dark:bg-gray-900 p-4 w-full max-w-[250px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.sidenav.lightSidebarLabel}</p>
                    {[
                      { icon: <Home className="size-4" />, label: S.sidenav.items.dashboard, active: true },
                      { icon: <Users className="size-4" />, label: S.sidenav.items.users },
                      { icon: <Package className="size-4" />, label: S.sidenav.items.assets, hasDropdown: true },
                      { icon: <Wrench className="size-4" />, label: S.sidenav.items.amc },
                      { icon: <BarChart3 className="size-4" />, label: S.sidenav.items.report },
                      { icon: <HeadphonesIcon className="size-4" />, label: S.sidenav.items.support },
                      { icon: <ShoppingCart className="size-4" />, label: S.sidenav.items.marketplace },
                      { icon: <Settings className="size-4" />, label: S.sidenav.items.settings },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${item.active ? 'bg-info-soft text-info' : 'text-muted-foreground hover:bg-gray-50 hover:text-gray-700'}`}>
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.hasDropdown && <ChevronDown className="size-3.5" />}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Dark Sidebar */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-900 p-4 w-full max-w-[250px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{S.sidenav.darkSidebarLabel}</p>
                    {[
                      { icon: <Home className="size-4" />, label: S.sidenav.items.dashboard, active: true },
                      { icon: <Users className="size-4" />, label: S.sidenav.items.users },
                      { icon: <Package className="size-4" />, label: S.sidenav.items.assets, hasDropdown: true },
                      { icon: <Wrench className="size-4" />, label: S.sidenav.items.amc },
                      { icon: <BarChart3 className="size-4" />, label: S.sidenav.items.report },
                      { icon: <HeadphonesIcon className="size-4" />, label: S.sidenav.items.support },
                      { icon: <ShoppingCart className="size-4" />, label: S.sidenav.items.marketplace },
                      { icon: <Settings className="size-4" />, label: S.sidenav.items.settings },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${item.active ? 'bg-gray-870 text-white' : 'text-muted-foreground hover:bg-gray-870 hover:text-white'}`}>
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.hasDropdown && <ChevronDown className="size-3.5" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ PROFILE DROPDOWN ══════════════ */}
        <Section id="profile-dropdown" title={S.profileDropdown.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="max-w-xs">
                <div className="bg-white dark:bg-gray-900 border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-4 border-b flex items-center gap-3">
                    <Avatar size="40"><AvatarFallback className="bg-info text-white">JD</AvatarFallback></Avatar>
                    <div>
                      <p className="text-[13px] font-semibold">{S.profileDropdown.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{S.profileDropdown.userRole}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    {S.profileDropdown.menuItems.map((item) => (
                      <div key={item} className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-870 cursor-pointer transition-colors">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-destructive hover:bg-destructive-soft cursor-pointer transition-colors">
                      <LogOut className="size-4" /> {S.profileDropdown.logout}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ DATE PICKER ══════════════ */}
        <Section id="datepicker" title={S.datePicker.sectionTitle}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.datePicker.labels.selectDate}</Label>
                  <div className="relative">
                    <Input placeholder={S.datePicker.placeholders.pickDate} />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.datePicker.labels.selectTime}</Label>
                  <div className="relative">
                    <Input placeholder={S.datePicker.placeholders.pickTime} />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.datePicker.labels.dateTime}</Label>
                  <div className="relative">
                    <Input placeholder={S.datePicker.placeholders.pickDateTime} />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">{S.datePicker.labels.dateRange}</Label>
                  <div className="relative">
                    <Input placeholder={S.datePicker.placeholders.dateRange} />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Mini calendar preview */}
                <div className="md:col-span-2">
                  <MiniCalendar />
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <div className="h-20" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ColorGroup({ title, colors }: { title: string; colors: Array<{ name: string; hex: string }> }) {
  const isDark = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 160
  }

  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-2">{title}</h3>
      <div className="space-y-1">
        {colors.map((c) => (
          <div key={c.name + c.hex} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[8px] font-bold border border-black/5"
              style={{ backgroundColor: c.hex, color: isDark(c.hex) ? '#3f4254' : '#ffffff' }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold leading-tight">{c.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{c.hex}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IconCategory({ title, icons }: { title: string; icons: Array<{ Icon: React.ComponentType<{ className?: string }>; name: string }> }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {icons.map(({ Icon, name }) => (
            <div key={name} className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted transition-colors cursor-default group" title={name}>
              <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FloatingLabelInput({ label, variant = 'outline', state, isTextarea }: {
  label: string
  variant?: 'outline' | 'solid' | 'tertiary'
  state?: 'success' | 'error'
  isTextarea?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState('')
  const isActive = focused || value.length > 0

  const borderColor = state === 'success' ? 'border-success' : state === 'error' ? 'border-destructive' : focused ? 'border-ring' : 'border-input'
  const bgClass = variant === 'solid' ? 'bg-gray-100 dark:bg-gray-870 border-transparent' : variant === 'tertiary' ? 'bg-transparent border-transparent' : ''

  return (
    <div className="relative">
      <label className={`absolute left-3 transition-all duration-200 pointer-events-none ${isActive ? 'top-1.5 text-[10px] font-semibold text-muted-foreground' : 'top-3 text-[14px] text-muted-foreground'}`}>
        {label}
      </label>
      {isTextarea ? (
        <textarea
          className={`w-full rounded-md border px-3 pt-6 pb-2 text-[15px] font-semibold outline-none resize-none transition-colors ${borderColor} ${bgClass}`}
          rows={3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          className={`w-full h-12 rounded-md border px-3 pt-4 pb-1 text-[15px] font-semibold outline-none transition-colors ${borderColor} ${bgClass}`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      {state === 'success' && <p className="text-[10px] text-success mt-1 font-medium">{S.floatingLabels.successHelper}</p>}
      {state === 'error' && <p className="text-[10px] text-destructive mt-1 font-medium">{S.floatingLabels.errorHelper}</p>}
    </div>
  )
}

function ToggleDemo() {
  const [on, setOn] = useState(false)
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{S.toggle.groupLabel}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setOn(!on)}
          className={`relative inline-flex h-8 w-[60px] items-center rounded-full transition-colors ${on ? 'bg-info' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
          <span className={`inline-block size-6 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[34px]' : 'translate-x-[2px]'}`} />
        </button>
        <span className="text-[13px] font-medium">{on ? S.toggle.on : S.toggle.off}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg overflow-hidden border">
          <button onClick={() => setOn(false)} className={`px-4 py-2 text-[13px] font-medium transition-colors ${!on ? 'bg-info text-white' : 'bg-white dark:bg-gray-900 text-muted-foreground'}`}>{S.toggle.off}</button>
          <button onClick={() => setOn(true)} className={`px-4 py-2 text-[13px] font-medium transition-colors ${on ? 'bg-info text-white' : 'bg-white dark:bg-gray-900 text-muted-foreground'}`}>{S.toggle.on}</button>
        </div>
        <span className="text-[13px] font-medium">{S.toggle.segmentedToggle}</span>
      </div>
    </div>
  )
}

function StepperDemo({ activeStep }: { activeStep: number }) {
  const steps = [
    { label: S.stepper.steps.businessInfo },
    { label: S.stepper.steps.addressDetails },
    { label: S.stepper.steps.confirmation },
  ]

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const stepNum = i + 1
        const isActive = stepNum === activeStep
        const isCompleted = stepNum < activeStep
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center text-[20px] font-semibold shrink-0 ${isCompleted ? 'bg-success text-white' : isActive ? 'bg-info text-white' : 'bg-gray-100 text-muted-foreground dark:bg-gray-870'}`}>
                {isCompleted ? <Check className="size-5" /> : stepNum}
              </div>
              <span className={`text-[14px] font-medium whitespace-nowrap ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-4 rounded ${isCompleted ? 'bg-success' : 'bg-gray-300 dark:bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RatingStars({ value, max, type }: { value: number; max: number; type: 'star' | 'heart' | 'emoji' }) {
  if (type === 'emoji') {
    const emojis = [
      { Icon: Frown, color: '#f1416c' },
      { Icon: Meh, color: '#f6c000' },
      { Icon: Smile, color: '#50cd89' },
      { Icon: Smile, color: '#1379f0' },
      { Icon: Smile, color: '#7239ea' },
    ]
    return (
      <div className="flex gap-3">
        {emojis.map(({ Icon, color }, i) => (
          <Icon key={i} className="size-6 cursor-pointer transition-colors" style={{ color }} />
        ))}
      </div>
    )
  }

  const Icon = type === 'heart' ? Heart : Star
  const activeColor = type === 'heart' ? '#f1416c' : '#f6c000'

  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Icon
          key={i}
          className="size-5 cursor-pointer transition-colors"
          style={{
            color: i < value ? activeColor : '#e0e2e9',
            fill: i < value ? activeColor : 'none',
          }}
        />
      ))}
    </div>
  )
}

function MiniCalendar() {
  const days = S.datePicker.calendar.days
  const today = 23

  return (
    <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon-sm"><ChevronLeft className="size-4" /></Button>
        <span className="text-[13px] font-semibold">{S.datePicker.calendar.monthYear}</span>
        <Button variant="ghost" size="icon-sm"><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <div key={d} className="text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: 31 }).map((_, i) => {
          const day = i + 1
          const isToday = day === today
          return (
            <div
              key={day}
              className={`text-[13px] py-1.5 rounded-md cursor-pointer transition-colors ${isToday ? 'bg-info text-white font-semibold' : 'hover:bg-info-soft text-muted-foreground'}`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}


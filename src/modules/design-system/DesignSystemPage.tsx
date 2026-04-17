import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import {
  Home, Users, Package, Settings, BarChart3, HeadphonesIcon, ShoppingCart, FileText,
  Search, Plus, Minus, Edit, Trash2, Download, Upload, Eye, EyeOff,
  ChevronDown, ChevronRight, ChevronLeft, ChevronUp, ChevronsUpDown,
  Check, X, AlertCircle, AlertTriangle, Info, CheckCircle2,
  Mail, Phone, MapPin, Calendar, Clock, Star, Heart,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, ExternalLink,
  Copy, Clipboard, Save, Printer, Share2, Send,
  Lock, Unlock, Shield, Key, Bell, BellOff,
  Sun, Moon, Monitor, Wifi, WifiOff, Battery, BatteryCharging,
  Image, Camera, Video, Mic, MicOff, Volume2, VolumeX,
  Filter, SlidersHorizontal, MoreHorizontal, MoreVertical, Menu, Grip,
  Folder, FolderOpen, File, FileCode, FileImage, FileArchive,
  Database, Server, Cloud, CloudDownload, CloudUpload, Globe,
  Zap, Rocket, Target, Flag, Bookmark, Tag,
  MessageSquare, MessageCircle, Inbox, Archive, Link, Paperclip,
  CircleDot, Circle, Square, Triangle, Hexagon, Smile, Frown, Meh,
  ThumbsUp, ThumbsDown, Award, Crown, Gift, Coffee,
  Cpu, HardDrive, Smartphone, Tablet, Laptop, Tv,
  Navigation, Compass, Map, LocateFixed,
  Scissors, Wrench, Hammer, PenTool, Palette, Brush,
  TrendingUp, TrendingDown, PieChart, Activity, BarChart2, LineChart,
  DollarSign, CreditCard, Wallet, Receipt, ShoppingBag,
  Truck, Car, Plane, Ship, Train,
  Building, Building2, Warehouse, Store,
  GraduationCap, BookOpen, Library, Lightbulb,
  Plug, Power, ToggleLeft, ToggleRight,
  Maximize2, Minimize2, Move, RotateCw, RotateCcw,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Type, Hash,
  ListOrdered, List, LayoutGrid, LayoutList, Table,
  GitBranch, GitCommit, GitMerge, GitPullRequest, GitFork,
  Terminal, Code, Braces, Binary,
  UserPlus, UserMinus, UserCheck, UserX, Users2,
  LogIn, LogOut, UserCircle, Fingerprint,
  PlayCircle, PauseCircle, StopCircle, SkipForward, SkipBack,
  Crosshair, ScanLine, QrCode, Barcode,
  Droplets, Flame, Snowflake, Wind, CloudRain,
  TreePine, Flower2, Bug, Feather, Leaf,
} from 'lucide-react'

// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
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
const tocItems = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'iconography', label: 'Iconography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'icon-buttons', label: 'Icon Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'floating-labels', label: 'Floating Labels' },
  { id: 'select', label: 'Select / Dropdown' },
  { id: 'badges', label: 'Badges' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'switches', label: 'Switch' },
  { id: 'checkboxes', label: 'Checkbox' },
  { id: 'radios', label: 'Radio' },
  { id: 'toggle', label: 'Toggle' },
  { id: 'progress', label: 'Progress' },
  { id: 'rating', label: 'Rating' },
  { id: 'breadcrumb', label: 'Breadcrumb' },
  { id: 'stepper', label: 'Stepper' },
  { id: 'file-upload', label: 'File Upload' },
  { id: 'sidenav', label: 'Sidebar Navigation' },
  { id: 'profile-dropdown', label: 'Profile Dropdown' },
  { id: 'datepicker', label: 'Date Picker' },
]

export default function DesignSystemPage() {
  return (
    <div className="flex gap-8 p-6 max-w-[1400px] mx-auto">
      {/* Sticky TOC Sidebar */}
      <nav className="hidden lg:block w-52 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">On this page</p>
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
          <h1 className="text-[38px] font-semibold leading-[38px]">ITASM Design System</h1>
          <p className="text-muted-foreground mt-3 text-[15px] font-medium leading-[16px]">
            Complete component library extracted from the ITASM Figma design file. Font: Lato.
          </p>
        </div>

        <Separator />

        {/* ══════════════ COLORS ══════════════ */}
        <Section id="colors" title="Colors">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            <ColorGroup title="Primary" colors={[
              { name: 'Primary', hex: '#1379F0' },
              { name: 'Active', hex: '#086DE3' },
              { name: 'Accent', hex: '#0D4B94' },
              { name: 'Light', hex: '#EEF5FF' },
            ]} />
            <ColorGroup title="Success" colors={[
              { name: 'Success', hex: '#50CD89' },
              { name: 'Active', hex: '#46BE7D' },
              { name: 'Accent', hex: '#0B5C22' },
              { name: 'Light', hex: '#E8FFF3' },
            ]} />
            <ColorGroup title="Danger" colors={[
              { name: 'Danger', hex: '#F1416C' },
              { name: 'Active', hex: '#D9214E' },
              { name: 'Accent', hex: '#991930' },
              { name: 'Light', hex: '#FFF5F8' },
            ]} />
            <ColorGroup title="Warning" colors={[
              { name: 'Warning', hex: '#F6C000' },
              { name: 'Active', hex: '#E8B500' },
              { name: 'Accent', hex: '#B88800' },
              { name: 'Light', hex: '#FFF8DD' },
            ]} />
            <ColorGroup title="Info" colors={[
              { name: 'Info', hex: '#7239EA' },
              { name: 'Active', hex: '#5014D0' },
              { name: 'Accent', hex: '#271086' },
              { name: 'Light', hex: '#F8F5FF' },
            ]} />
            <ColorGroup title="Gray" colors={[
              { name: '100', hex: '#F1F1F2' },
              { name: '200', hex: '#E0E2E9' },
              { name: '300', hex: '#D8D8E5' },
              { name: '400', hex: '#A1A5B7' },
              { name: '500', hex: '#7E8299' },
              { name: '600', hex: '#5E6278' },
              { name: '700', hex: '#3F4254' },
              { name: '800', hex: '#181C32' },
            ]} />
            <ColorGroup title="Base" colors={[
              { name: 'White', hex: '#FFFFFF' },
              { name: 'Background', hex: '#F9F9F9' },
              { name: 'Dark', hex: '#181C32' },
            ]} />
          </div>
        </Section>

        <Separator />

        {/* ══════════════ TYPOGRAPHY ══════════════ */}
        <Section id="typography" title="Typography">
          <Card>
            <CardHeader>
              <CardTitle>Font: Lato</CardTitle>
              <p className="text-muted-foreground text-sm">Primary typeface used across the entire ITASM design system.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Font preview */}
              <div className="bg-[#f9f9f9] dark:bg-[#1e1e2d] rounded-lg p-6 mb-6 text-center">
                <p className="text-[80px] font-bold leading-[80px] text-[#1379f0]">lato</p>
                <p className="text-[26px] font-bold mt-4">The five boxing wizards jump quickly.</p>
                <p className="text-[18px] font-medium mt-3 text-muted-foreground">
                  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                </p>
                <p className="text-[16px] font-medium mt-2 text-muted-foreground">1 2 3 4 5 6 7 8 9 0</p>
                <p className="text-[14px] font-medium mt-1 text-muted-foreground">{'! @ # $ % ^ & * ( )'}</p>
              </div>

              {/* Typography scale table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Preview</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Weight</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Size</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Line Height</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { name: 'H-50-54-700', weight: 700, size: 50, lh: 54 },
                      { name: 'H-44-56-700', weight: 700, size: 44, lh: 56 },
                      { name: 'H-38-38-600', weight: 600, size: 38, lh: 38 },
                      { name: 'H-34-34-600', weight: 600, size: 34, lh: 34 },
                      { name: 'H-30-30-600', weight: 600, size: 30, lh: 30 },
                      { name: 'H-26-26-600', weight: 600, size: 26, lh: 26 },
                      { name: 'H-24-24-600', weight: 600, size: 24, lh: 24 },
                      { name: 'H-22-38-500', weight: 500, size: 22, lh: 38 },
                      { name: 'H-22-22-600', weight: 600, size: 22, lh: 22 },
                      { name: 'H-20-20-600', weight: 600, size: 20, lh: 20 },
                      { name: 'B-20-20-500', weight: 500, size: 20, lh: 30 },
                      { name: 'B-18-30-500', weight: 500, size: 18, lh: 30 },
                      { name: 'B-18-18-600', weight: 600, size: 18, lh: 18 },
                      { name: 'B-16-16-500', weight: 500, size: 16, lh: 16 },
                      { name: 'B-16-16-600', weight: 600, size: 16, lh: 16 },
                      { name: 'B-15-15-500', weight: 500, size: 15, lh: 16 },
                      { name: 'B-15-15-600', weight: 600, size: 15, lh: 16 },
                      { name: 'B-14-14-500', weight: 500, size: 14, lh: 14 },
                      { name: 'B-14-14-600', weight: 600, size: 14, lh: 14 },
                      { name: 'B-14-14-700', weight: 700, size: 14, lh: 14 },
                      { name: 'B-13-13-600', weight: 600, size: 13, lh: 14 },
                      { name: 'B-13-13-700', weight: 700, size: 13, lh: 14 },
                      { name: 'B-12-12-500', weight: 500, size: 12, lh: 12 },
                      { name: 'B-12-12-600', weight: 600, size: 12, lh: 12 },
                      { name: 'B-12-12-700', weight: 700, size: 12, lh: 12 },
                      { name: 'B-11-11-600', weight: 600, size: 11, lh: 11 },
                      { name: 'B-10-10-600', weight: 600, size: 10, lh: 10 },
                      { name: 'B-9-9-600', weight: 600, size: 9, lh: 9 },
                    ].map((t) => (
                      <tr key={t.name} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.name}</td>
                        <td className="px-4 py-2">
                          <span style={{ fontSize: Math.min(t.size, 30), fontWeight: t.weight, lineHeight: `${Math.min(t.lh, 34)}px` }}>
                            {t.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{t.weight === 500 ? 'Medium' : t.weight === 600 ? 'SemiBold' : 'Bold'} ({t.weight})</td>
                        <td className="px-4 py-2 text-muted-foreground">{t.size}px</td>
                        <td className="px-4 py-2 text-muted-foreground">{t.lh}px</td>
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
        <Section id="iconography" title="Iconography">
          <p className="text-sm text-muted-foreground mb-4">1,696+ icons available. Using Lucide React icon library, categorized to match the ITASM Figma icon set.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <IconCategory title="General" icons={[
              { Icon: Home, name: 'home' }, { Icon: Search, name: 'search' }, { Icon: Menu, name: 'menu' },
              { Icon: Settings, name: 'settings' }, { Icon: Bell, name: 'bell' }, { Icon: Star, name: 'star' },
              { Icon: Heart, name: 'heart' }, { Icon: Eye, name: 'eye' }, { Icon: EyeOff, name: 'eye-off' },
              { Icon: Filter, name: 'filter' }, { Icon: SlidersHorizontal, name: 'sliders' }, { Icon: Tag, name: 'tag' },
              { Icon: Bookmark, name: 'bookmark' }, { Icon: Flag, name: 'flag' }, { Icon: Zap, name: 'zap' },
              { Icon: Rocket, name: 'rocket' }, { Icon: Target, name: 'target' }, { Icon: Crown, name: 'crown' },
              { Icon: Gift, name: 'gift' }, { Icon: Coffee, name: 'coffee' }, { Icon: Lightbulb, name: 'lightbulb' },
              { Icon: Smile, name: 'smile' }, { Icon: Frown, name: 'frown' }, { Icon: Meh, name: 'meh' },
            ]} />
            <IconCategory title="Actions" icons={[
              { Icon: Plus, name: 'plus' }, { Icon: Minus, name: 'minus' }, { Icon: Edit, name: 'edit' },
              { Icon: Trash2, name: 'trash' }, { Icon: Download, name: 'download' }, { Icon: Upload, name: 'upload' },
              { Icon: Copy, name: 'copy' }, { Icon: Clipboard, name: 'clipboard' }, { Icon: Save, name: 'save' },
              { Icon: Printer, name: 'printer' }, { Icon: Share2, name: 'share' }, { Icon: Send, name: 'send' },
              { Icon: RefreshCw, name: 'refresh' }, { Icon: ExternalLink, name: 'external-link' }, { Icon: Link, name: 'link' },
              { Icon: Paperclip, name: 'paperclip' }, { Icon: Check, name: 'check' }, { Icon: X, name: 'close' },
              { Icon: LogIn, name: 'log-in' }, { Icon: LogOut, name: 'log-out' }, { Icon: Lock, name: 'lock' },
              { Icon: Unlock, name: 'unlock' }, { Icon: ThumbsUp, name: 'thumbs-up' }, { Icon: ThumbsDown, name: 'thumbs-down' },
            ]} />
            <IconCategory title="Navigation & Arrows" icons={[
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
            <IconCategory title="Communication" icons={[
              { Icon: Mail, name: 'mail' }, { Icon: Phone, name: 'phone' }, { Icon: MessageSquare, name: 'message' },
              { Icon: MessageCircle, name: 'message-circle' }, { Icon: Inbox, name: 'inbox' }, { Icon: Archive, name: 'archive' },
              { Icon: BellOff, name: 'bell-off' }, { Icon: Mic, name: 'mic' }, { Icon: MicOff, name: 'mic-off' },
              { Icon: Volume2, name: 'volume' }, { Icon: VolumeX, name: 'volume-x' }, { Icon: Video, name: 'video' },
            ]} />
            <IconCategory title="Files & Documents" icons={[
              { Icon: File, name: 'file' }, { Icon: FileText, name: 'file-text' }, { Icon: FileCode, name: 'file-code' },
              { Icon: FileImage, name: 'file-image' }, { Icon: FileArchive, name: 'file-archive' },
              { Icon: Folder, name: 'folder' }, { Icon: FolderOpen, name: 'folder-open' },
              { Icon: Image, name: 'image' }, { Icon: Camera, name: 'camera' },
            ]} />
            <IconCategory title="Users & People" icons={[
              { Icon: Users, name: 'users' }, { Icon: Users2, name: 'users-2' }, { Icon: UserPlus, name: 'user-plus' },
              { Icon: UserMinus, name: 'user-minus' }, { Icon: UserCheck, name: 'user-check' }, { Icon: UserX, name: 'user-x' },
              { Icon: UserCircle, name: 'user-circle' }, { Icon: Fingerprint, name: 'fingerprint' },
              { Icon: Shield, name: 'shield' }, { Icon: Key, name: 'key' },
            ]} />
            <IconCategory title="Charts & Data" icons={[
              { Icon: BarChart3, name: 'bar-chart' }, { Icon: BarChart2, name: 'bar-chart-2' },
              { Icon: LineChart, name: 'line-chart' }, { Icon: PieChart, name: 'pie-chart' },
              { Icon: TrendingUp, name: 'trending-up' }, { Icon: TrendingDown, name: 'trending-down' },
              { Icon: Activity, name: 'activity' }, { Icon: Table, name: 'table' },
            ]} />
            <IconCategory title="Devices & Tech" icons={[
              { Icon: Smartphone, name: 'smartphone' }, { Icon: Tablet, name: 'tablet' }, { Icon: Laptop, name: 'laptop' },
              { Icon: Tv, name: 'tv' }, { Icon: Cpu, name: 'cpu' }, { Icon: HardDrive, name: 'hard-drive' },
              { Icon: Database, name: 'database' }, { Icon: Server, name: 'server' }, { Icon: Cloud, name: 'cloud' },
              { Icon: Globe, name: 'globe' }, { Icon: Wifi, name: 'wifi' }, { Icon: WifiOff, name: 'wifi-off' },
              { Icon: Battery, name: 'battery' }, { Icon: BatteryCharging, name: 'battery-charging' },
              { Icon: Plug, name: 'plug' }, { Icon: Power, name: 'power' },
            ]} />
            <IconCategory title="Commerce" icons={[
              { Icon: ShoppingCart, name: 'cart' }, { Icon: ShoppingBag, name: 'bag' },
              { Icon: DollarSign, name: 'dollar' }, { Icon: CreditCard, name: 'credit-card' },
              { Icon: Wallet, name: 'wallet' }, { Icon: Receipt, name: 'receipt' },
              { Icon: Store, name: 'store' }, { Icon: Building, name: 'building' },
              { Icon: Building2, name: 'building-2' }, { Icon: Warehouse, name: 'warehouse' },
            ]} />
            <IconCategory title="Design & Editor" icons={[
              { Icon: PenTool, name: 'pen-tool' }, { Icon: Palette, name: 'palette' }, { Icon: Brush, name: 'brush' },
              { Icon: Scissors, name: 'scissors' }, { Icon: Type, name: 'type' },
              { Icon: Bold, name: 'bold' }, { Icon: Italic, name: 'italic' }, { Icon: Underline, name: 'underline' },
              { Icon: AlignLeft, name: 'align-left' }, { Icon: AlignCenter, name: 'align-center' },
              { Icon: AlignRight, name: 'align-right' }, { Icon: AlignJustify, name: 'align-justify' },
              { Icon: LayoutGrid, name: 'layout-grid' }, { Icon: LayoutList, name: 'layout-list' },
              { Icon: List, name: 'list' }, { Icon: ListOrdered, name: 'list-ordered' },
            ]} />
            <IconCategory title="Development" icons={[
              { Icon: Code, name: 'code' }, { Icon: Terminal, name: 'terminal' }, { Icon: Braces, name: 'braces' },
              { Icon: Binary, name: 'binary' }, { Icon: Hash, name: 'hash' },
              { Icon: GitBranch, name: 'git-branch' }, { Icon: GitCommit, name: 'git-commit' },
              { Icon: GitMerge, name: 'git-merge' }, { Icon: GitPullRequest, name: 'git-pr' },
              { Icon: GitFork, name: 'github' }, { Icon: Bug, name: 'bug' },
            ]} />
            <IconCategory title="Transport" icons={[
              { Icon: Truck, name: 'truck' }, { Icon: Car, name: 'car' }, { Icon: Plane, name: 'plane' },
              { Icon: Ship, name: 'ship' }, { Icon: Train, name: 'train' }, { Icon: MapPin, name: 'map-pin' },
            ]} />
            <IconCategory title="Status & Alerts" icons={[
              { Icon: AlertCircle, name: 'alert-circle' }, { Icon: AlertTriangle, name: 'alert-triangle' },
              { Icon: Info, name: 'info' }, { Icon: CheckCircle2, name: 'check-circle' },
              { Icon: CircleDot, name: 'circle-dot' }, { Icon: Circle, name: 'circle' },
              { Icon: Award, name: 'award' }, { Icon: Crosshair, name: 'crosshair' },
              { Icon: ScanLine, name: 'scan' }, { Icon: QrCode, name: 'qr-code' }, { Icon: Barcode, name: 'barcode' },
            ]} />
            <IconCategory title="Media" icons={[
              { Icon: PlayCircle, name: 'play' }, { Icon: PauseCircle, name: 'pause' },
              { Icon: StopCircle, name: 'stop' }, { Icon: SkipForward, name: 'skip-fwd' },
              { Icon: SkipBack, name: 'skip-back' }, { Icon: Sun, name: 'sun' },
              { Icon: Moon, name: 'moon' }, { Icon: Monitor, name: 'monitor' },
            ]} />
          </div>
        </Section>

        <Separator />

        {/* ══════════════ BUTTONS ══════════════ */}
        <Section id="buttons" title="Buttons">
          {/* Solid */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Solid Buttons</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">All Colors</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button>Primary</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="destructive">Danger</Button>
                  <Button variant="info">Info</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="secondary">Grey</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Sizes: Large / Default / Small / XS</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="lg">Large</Button>
                  <Button>Default</Button>
                  <Button size="sm">Small</Button>
                  <Button size="xs">XS</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Rounded Shape</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button shape="rounded">Primary</Button>
                  <Button variant="success" shape="rounded">Success</Button>
                  <Button variant="destructive" shape="rounded">Danger</Button>
                  <Button variant="info" shape="rounded">Info</Button>
                  <Button variant="warning" shape="rounded">Warning</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">With Icons</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button><Plus data-icon="inline-start" className="size-4" /> Add New</Button>
                  <Button variant="success"><Check data-icon="inline-start" className="size-4" /> Approve</Button>
                  <Button variant="destructive"><Trash2 data-icon="inline-start" className="size-4" /> Delete</Button>
                  <Button variant="info"><Download data-icon="inline-start" className="size-4" /> Download</Button>
                  <Button variant="warning"><AlertTriangle data-icon="inline-start" className="size-4" /> Warning</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">States</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Light */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Light Buttons</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary-light">Primary</Button>
                <Button variant="success-light">Success</Button>
                <Button variant="danger-light">Danger</Button>
                <Button variant="info-light">Info</Button>
                <Button variant="warning-light">Warning</Button>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">With Icons</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary-light"><Plus data-icon="inline-start" className="size-4" /> Add</Button>
                  <Button variant="success-light"><Check data-icon="inline-start" className="size-4" /> Done</Button>
                  <Button variant="danger-light"><X data-icon="inline-start" className="size-4" /> Cancel</Button>
                  <Button variant="info-light"><Info data-icon="inline-start" className="size-4" /> Info</Button>
                  <Button variant="warning-light"><AlertTriangle data-icon="inline-start" className="size-4" /> Warn</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">All Sizes</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary-light" size="lg">Large</Button>
                  <Button variant="primary-light">Default</Button>
                  <Button variant="primary-light" size="sm">Small</Button>
                  <Button variant="primary-light" size="xs">XS</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tertiary */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Tertiary Buttons (Text)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary-tertiary">Primary</Button>
                <Button variant="success-tertiary">Success</Button>
                <Button variant="danger-tertiary">Danger</Button>
                <Button variant="info-tertiary">Info</Button>
                <Button variant="warning-tertiary">Warning</Button>
              </div>
            </CardContent>
          </Card>

          {/* Other */}
          <Card>
            <CardHeader><CardTitle>Other Variants</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ ICON BUTTONS ══════════════ */}
        <Section id="icon-buttons" title="Icon Buttons">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Solid — All Colors — Square</p>
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
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Solid — All Colors — Rounded</p>
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
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Light — All Colors</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="primary-light"><Plus /></Button>
                  <Button size="icon" variant="success-light"><Check /></Button>
                  <Button size="icon" variant="danger-light"><X /></Button>
                  <Button size="icon" variant="info-light"><Info /></Button>
                  <Button size="icon" variant="warning-light"><AlertTriangle /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Tertiary</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon" variant="primary-tertiary"><Plus /></Button>
                  <Button size="icon" variant="success-tertiary"><Check /></Button>
                  <Button size="icon" variant="danger-tertiary"><X /></Button>
                  <Button size="icon" variant="info-tertiary"><Info /></Button>
                  <Button size="icon" variant="warning-tertiary"><AlertTriangle /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Sizes: Large / Default / Small / XS</p>
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
        <Section id="inputs" title="Inputs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Styles</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">Outline (Default)</Label><Input variant="outline" placeholder="Enter text..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">Solid</Label><Input variant="solid" placeholder="Enter text..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">Tertiary</Label><Input variant="tertiary" placeholder="Enter text..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">White</Label><Input variant="white" placeholder="Enter text..." /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Sizes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">Large</Label><Input inputSize="lg" placeholder="Large input..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">Medium (Default)</Label><Input inputSize="default" placeholder="Medium input..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium">Small</Label><Input inputSize="sm" placeholder="Small input..." /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Types</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">Text Field</Label><Input placeholder="Text field..." /></div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-10" placeholder="Search..." />
                  </div>
                </div>
                <div><Label className="mb-1.5 text-[13px] font-medium">Disabled</Label><Input disabled placeholder="Disabled input..." /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>States</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1.5 text-[13px] font-medium">Default</Label><Input placeholder="Default state..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium text-[#50cd89]">Success</Label><Input className="border-[#50cd89] focus-visible:border-[#50cd89] focus-visible:ring-[#50cd89]/30" placeholder="Valid input..." /></div>
                <div><Label className="mb-1.5 text-[13px] font-medium text-[#f1416c]">Error</Label><Input className="border-[#f1416c] focus-visible:border-[#f1416c] focus-visible:ring-[#f1416c]/30" placeholder="Invalid input..." /></div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">With Helper Text</Label>
                  <Input placeholder="Enter email..." />
                  <p className="text-xs text-muted-foreground mt-1">We'll never share your email with anyone else.</p>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Required <span className="text-[#f1416c]">*</span></Label>
                  <Input placeholder="Required field..." />
                  <p className="text-xs text-[#f1416c] mt-1">This field is required.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ FLOATING LABELS ══════════════ */}
        <Section id="floating-labels" title="Floating Labels">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['outline', 'solid', 'tertiary'] as const).map((style) => (
                <FloatingLabelInput key={style} label={`${style.charAt(0).toUpperCase() + style.slice(1)} Style`} variant={style} />
              ))}
              <FloatingLabelInput label="Textarea" variant="outline" isTextarea />
              <FloatingLabelInput label="Success State" variant="outline" state="success" />
              <FloatingLabelInput label="Error State" variant="outline" state="error" />
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ SELECT ══════════════ */}
        <Section id="select" title="Select / Dropdown">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">Outline Select</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-input bg-transparent px-3 pr-8 text-sm outline-none appearance-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                    <option>Select an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">Solid Select</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-transparent bg-[#f1f1f2] dark:bg-[#2d2d3f] px-3 pr-8 text-sm outline-none appearance-none focus:border-ring focus:ring-3 focus:ring-ring/50">
                    <option>Select an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium">Disabled Select</Label>
                <div className="relative">
                  <select disabled className="w-full h-10 rounded-md border border-input bg-transparent px-3 pr-8 text-sm outline-none appearance-none opacity-50 cursor-not-allowed">
                    <option>Disabled</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-[13px] font-medium text-[#f1416c]">Invalid Select</Label>
                <div className="relative">
                  <select className="w-full h-10 rounded-md border border-[#f1416c] bg-transparent px-3 pr-8 text-sm outline-none appearance-none ring-3 ring-[#f1416c]/20">
                    <option>Invalid selection</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-[#f1416c] mt-1">Please select a valid option.</p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ BADGES ══════════════ */}
        <Section id="badges" title="Badges">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Solid Badges</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pill Shape</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Primary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="destructive">Danger</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="grey">Grey</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Rounded Shape</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge shape="rounded">Primary</Badge>
                    <Badge variant="success" shape="rounded">Success</Badge>
                    <Badge variant="destructive" shape="rounded">Danger</Badge>
                    <Badge variant="info" shape="rounded">Info</Badge>
                    <Badge variant="warning" shape="rounded">Warning</Badge>
                    <Badge variant="grey" shape="rounded">Grey</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Sizes</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge size="sm">Small</Badge>
                    <Badge size="default">Medium</Badge>
                    <Badge size="lg">Large</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Soft / Light Badges</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pill Shape</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary-soft">Primary</Badge>
                    <Badge variant="success-soft">Success</Badge>
                    <Badge variant="danger-soft">Danger</Badge>
                    <Badge variant="info-soft">Info</Badge>
                    <Badge variant="warning-soft">Warning</Badge>
                    <Badge variant="grey-soft">Grey</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Rounded Shape</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary-soft" shape="rounded">Primary</Badge>
                    <Badge variant="success-soft" shape="rounded">Success</Badge>
                    <Badge variant="danger-soft" shape="rounded">Danger</Badge>
                    <Badge variant="info-soft" shape="rounded">Info</Badge>
                    <Badge variant="warning-soft" shape="rounded">Warning</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Other Variants</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ AVATARS ══════════════ */}
        <Section id="avatars" title="Avatars">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Sizes (Circle)</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Sizes (Rounded)</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Status Badges</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {(['online', 'offline', 'busy', 'away'] as const).map((st) => (
                    <div key={st} className="flex flex-col items-center gap-1">
                      <Avatar size="40"><AvatarFallback>{st[0].toUpperCase()}{st[1].toUpperCase()}</AvatarFallback><AvatarBadge status={st} /></Avatar>
                      <span className="text-[10px] text-muted-foreground capitalize">{st}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Letter Types</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback>AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">Light Letter</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-[#1379f0] text-white">AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">Contrast</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-transparent border-2 border-[#1379f0] text-[#1379f0]">AB</AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">Outline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Avatar size="40"><AvatarFallback className="bg-[#eef5ff] text-[#1379f0]"><Users className="size-5" /></AvatarFallback></Avatar>
                    <span className="text-[10px] text-muted-foreground">Light Icon</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* ══════════════ ALERTS ══════════════ */}
        <Section id="alerts" title="Alerts">
          <div className="space-y-4">
            {[
              { color: 'Primary', bg: '#eef5ff', border: '#1379f0', text: '#0d4b94', icon: <Info className="size-5" /> },
              { color: 'Success', bg: '#e8fff3', border: '#50cd89', text: '#0b5c22', icon: <CheckCircle2 className="size-5" /> },
              { color: 'Danger', bg: '#fff5f8', border: '#f1416c', text: '#991930', icon: <AlertCircle className="size-5" /> },
              { color: 'Warning', bg: '#fff8dd', border: '#f6c000', text: '#b88800', icon: <AlertTriangle className="size-5" /> },
              { color: 'Info', bg: '#f8f5ff', border: '#7239ea', text: '#271086', icon: <Info className="size-5" /> },
            ].map(({ color, bg, border, text, icon }) => (
              <div key={color}>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{color}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Light */}
                  <div className="rounded-md p-4 flex items-start gap-3" style={{ backgroundColor: bg, color: text }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">This is an alert</p>
                      <p className="text-xs mt-0.5 opacity-80">The alert component highlights important content.</p>
                    </div>
                  </div>
                  {/* Solid */}
                  <div className="rounded-md p-4 flex items-start gap-3 text-white" style={{ backgroundColor: border }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">This is an alert</p>
                      <p className="text-xs mt-0.5 opacity-80">Solid style with strong visual emphasis.</p>
                    </div>
                  </div>
                  {/* Outline */}
                  <div className="rounded-md p-4 flex items-start gap-3 border-2 bg-white dark:bg-transparent" style={{ borderColor: border, color: text }}>
                    {icon}
                    <div>
                      <p className="font-semibold text-sm">This is an alert</p>
                      <p className="text-xs mt-0.5 opacity-80">Outline style with bordered appearance.</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        {/* ══════════════ SWITCHES ══════════════ */}
        <Section id="switches" title="Switch">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Large (Default)</p>
                  <div className="flex items-center gap-3"><Switch /><Label>Default Switch</Label></div>
                  <div className="flex items-center gap-3"><Switch defaultChecked /><Label>Checked Switch</Label></div>
                  <div className="flex items-center gap-3"><Switch disabled /><Label>Disabled Switch</Label></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Small</p>
                  <div className="flex items-center gap-3"><Switch size="sm" /><Label>Default Switch</Label></div>
                  <div className="flex items-center gap-3"><Switch size="sm" defaultChecked /><Label>Checked Switch</Label></div>
                  <div className="flex items-center gap-3"><Switch size="sm" disabled /><Label>Disabled Switch</Label></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ CHECKBOXES ══════════════ */}
        <Section id="checkboxes" title="Checkbox">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Without Label</p>
                  <div className="flex items-center gap-4">
                    <Checkbox />
                    <Checkbox defaultChecked />
                    <Checkbox disabled />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">With Label</p>
                  <div className="flex items-center gap-3"><Checkbox /><Label className="text-[13px] font-medium">Default with label</Label></div>
                  <div className="flex items-center gap-3"><Checkbox defaultChecked /><Label className="text-[13px] font-medium">Checked with label</Label></div>
                  <div className="flex items-center gap-3"><Checkbox disabled /><Label className="text-[13px] font-medium text-muted-foreground">Disabled with label</Label></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ RADIOS ══════════════ */}
        <Section id="radios" title="Radio">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Large (Default)</p>
                  <RadioGroup defaultValue="r1">
                    <div className="flex items-center gap-3"><RadioGroupItem value="r1" /><Label className="text-[13px] font-medium">Default radio with label</Label></div>
                    <div className="flex items-center gap-3"><RadioGroupItem value="r2" /><Label className="text-[13px] font-medium">Checked radio with label</Label></div>
                    <div className="flex items-center gap-3"><RadioGroupItem value="r3" disabled /><Label className="text-[13px] font-medium text-muted-foreground">Disabled radio with label</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Without Label</p>
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
        <Section id="toggle" title="Toggle">
          <Card>
            <CardContent className="p-6">
              <ToggleDemo />
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ PROGRESS ══════════════ */}
        <Section id="progress" title="Progress">
          <Card>
            <CardHeader><CardTitle>Linear Progress</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {([
                { color: 'primary' as const, value: 75 },
                { color: 'success' as const, value: 65 },
                { color: 'danger' as const, value: 45 },
                { color: 'info' as const, value: 55 },
                { color: 'warning' as const, value: 85 },
                { color: 'dark' as const, value: 40 },
              ]).map(({ color, value }) => (
                <Progress key={color} value={value} color={color}>
                  <ProgressLabel>{color.charAt(0).toUpperCase() + color.slice(1)}</ProgressLabel>
                  <ProgressValue>{value}%</ProgressValue>
                </Progress>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ RATING ══════════════ */}
        <Section id="rating" title="Rating">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Star Rating</p>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1, 0].map((rated) => (
                    <div key={rated} className="flex items-center gap-2">
                      <RatingStars value={rated} max={5} type="star" />
                      <span className="text-xs text-muted-foreground">({rated}/5)</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Heart Rating</p>
                <div className="space-y-3">
                  {[5, 3, 1].map((rated) => (
                    <div key={rated} className="flex items-center gap-2">
                      <RatingStars value={rated} max={5} type="heart" />
                      <span className="text-xs text-muted-foreground">({rated}/5)</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Emoji Rating</p>
                <div className="flex gap-4">
                  <RatingStars value={1} max={5} type="emoji" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ BREADCRUMB ══════════════ */}
        <Section id="breadcrumb" title="Breadcrumb">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Full Breadcrumb</p>
                <nav className="flex items-center gap-2 text-[13px]">
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
                  <span className="text-muted-foreground">/</span>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Account</a>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground font-medium">Overview</span>
                </nav>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Light Breadcrumb</p>
                <nav className="flex items-center gap-2 text-[13px]">
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Settings</a>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <span className="text-foreground font-medium">Profile</span>
                </nav>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Dark Mode Breadcrumb</p>
                <div className="bg-[#181c32] rounded-lg p-4">
                  <nav className="flex items-center gap-2 text-[13px]">
                    <a href="#" className="text-[#a1a5b7] hover:text-white transition-colors">Home</a>
                    <span className="text-[#5e6278]">/</span>
                    <a href="#" className="text-[#a1a5b7] hover:text-white transition-colors">Dashboard</a>
                    <span className="text-[#5e6278]">/</span>
                    <span className="text-white font-medium">Analytics</span>
                  </nav>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ STEPPER ══════════════ */}
        <Section id="stepper" title="Stepper">
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
        <Section id="file-upload" title="File Upload">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default */}
              <div className="border-2 border-dashed border-[#e0e2e9] dark:border-[#3f4254] rounded-lg p-8 text-center hover:border-[#1379f0] transition-colors cursor-pointer">
                <Upload className="size-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-[13px] font-medium">Upload a file or drag and drop here</p>
                <p className="text-[12px] text-muted-foreground mt-1">JPG, PNG or PDF, file size no more than 10MB</p>
                <Button variant="primary-light" size="sm" className="mt-4">Browse File</Button>
              </div>
              {/* With file selected */}
              <div className="border-2 border-dashed border-[#50cd89] rounded-lg p-8 text-center">
                <CheckCircle2 className="size-10 mx-auto text-[#50cd89] mb-3" />
                <p className="text-[13px] font-medium">document.pdf</p>
                <p className="text-[12px] text-muted-foreground mt-1">2.4 MB - Uploaded successfully</p>
                <Button variant="danger-light" size="sm" className="mt-4"><X className="size-3" /> Remove</Button>
              </div>
              {/* Compact */}
              <div className="border border-[#e0e2e9] dark:border-[#3f4254] rounded-lg p-4 flex items-center gap-4">
                <div className="size-12 rounded-lg bg-[#eef5ff] flex items-center justify-center shrink-0">
                  <Upload className="size-5 text-[#1379f0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">Upload a file</p>
                  <p className="text-[11px] text-muted-foreground">Max 10MB</p>
                </div>
                <Button variant="primary-light" size="xs">Upload</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ SIDENAV ══════════════ */}
        <Section id="sidenav" title="Sidebar Navigation">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Light Sidebar */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-white dark:bg-[#1e1e2d] p-4 w-full max-w-[250px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Light Sidebar</p>
                    {[
                      { icon: <Home className="size-4" />, label: 'Dashboard', active: true },
                      { icon: <Users className="size-4" />, label: 'Users' },
                      { icon: <Package className="size-4" />, label: 'Assets', hasDropdown: true },
                      { icon: <Wrench className="size-4" />, label: 'AMC' },
                      { icon: <BarChart3 className="size-4" />, label: 'Report' },
                      { icon: <HeadphonesIcon className="size-4" />, label: 'Support' },
                      { icon: <ShoppingCart className="size-4" />, label: 'Marketplace' },
                      { icon: <Settings className="size-4" />, label: 'Settings' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${item.active ? 'bg-[#eef5ff] text-[#1379f0]' : 'text-[#5e6278] hover:bg-[#f9f9f9] hover:text-[#3f4254]'}`}>
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.hasDropdown && <ChevronDown className="size-3.5" />}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Dark Sidebar */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-[#1e1e2d] p-4 w-full max-w-[250px]">
                    <p className="text-xs font-semibold text-[#a1a5b7] mb-3 uppercase tracking-wider">Dark Sidebar</p>
                    {[
                      { icon: <Home className="size-4" />, label: 'Dashboard', active: true },
                      { icon: <Users className="size-4" />, label: 'Users' },
                      { icon: <Package className="size-4" />, label: 'Assets', hasDropdown: true },
                      { icon: <Wrench className="size-4" />, label: 'AMC' },
                      { icon: <BarChart3 className="size-4" />, label: 'Report' },
                      { icon: <HeadphonesIcon className="size-4" />, label: 'Support' },
                      { icon: <ShoppingCart className="size-4" />, label: 'Marketplace' },
                      { icon: <Settings className="size-4" />, label: 'Settings' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium cursor-pointer transition-colors ${item.active ? 'bg-[#2d2d3f] text-white' : 'text-[#a1a5b7] hover:bg-[#2d2d3f] hover:text-white'}`}>
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
        <Section id="profile-dropdown" title="Profile Dropdown">
          <Card>
            <CardContent className="p-6">
              <div className="max-w-xs">
                <div className="bg-white dark:bg-[#1e1e2d] border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-4 border-b flex items-center gap-3">
                    <Avatar size="40"><AvatarFallback className="bg-[#1379f0] text-white">JD</AvatarFallback></Avatar>
                    <div>
                      <p className="text-[13px] font-semibold">John Doe</p>
                      <p className="text-[11px] text-muted-foreground">Admin</p>
                    </div>
                  </div>
                  <div className="p-2">
                    {['Profile', 'Display', 'Account Settings'].map((item) => (
                      <div key={item} className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#5e6278] hover:bg-[#f9f9f9] dark:hover:bg-[#2d2d3f] cursor-pointer transition-colors">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#f1416c] hover:bg-[#fff5f8] cursor-pointer transition-colors">
                      <LogOut className="size-4" /> Logout
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* ══════════════ DATE PICKER ══════════════ */}
        <Section id="datepicker" title="Date Picker">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Select Date</Label>
                  <div className="relative">
                    <Input placeholder="Pick a date..." />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Select Time</Label>
                  <div className="relative">
                    <Input placeholder="Pick a time..." />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Date & Time</Label>
                  <div className="relative">
                    <Input placeholder="Pick date and time..." />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-[13px] font-medium">Date Range</Label>
                  <div className="relative">
                    <Input placeholder="Start date - End date" />
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
              <Icon className="size-5 text-[#5e6278] group-hover:text-foreground transition-colors" />
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

  const borderColor = state === 'success' ? 'border-[#50cd89]' : state === 'error' ? 'border-[#f1416c]' : focused ? 'border-ring' : 'border-input'
  const bgClass = variant === 'solid' ? 'bg-[#f1f1f2] dark:bg-[#2d2d3f] border-transparent' : variant === 'tertiary' ? 'bg-transparent border-transparent' : ''

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
      {state === 'success' && <p className="text-[10px] text-[#50cd89] mt-1 font-medium">Looks good!</p>}
      {state === 'error' && <p className="text-[10px] text-[#f1416c] mt-1 font-medium">This field is required.</p>}
    </div>
  )
}

function ToggleDemo() {
  const [on, setOn] = useState(false)
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toggle Switch</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setOn(!on)}
          className={`relative inline-flex h-8 w-[60px] items-center rounded-full transition-colors ${on ? 'bg-[#1379f0]' : 'bg-[#e0e2e9] dark:bg-[#3f4254]'}`}
        >
          <span className={`inline-block size-6 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[34px]' : 'translate-x-[2px]'}`} />
        </button>
        <span className="text-[13px] font-medium">{on ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg overflow-hidden border">
          <button onClick={() => setOn(false)} className={`px-4 py-2 text-[13px] font-medium transition-colors ${!on ? 'bg-[#1379f0] text-white' : 'bg-white dark:bg-[#1e1e2d] text-[#5e6278]'}`}>Off</button>
          <button onClick={() => setOn(true)} className={`px-4 py-2 text-[13px] font-medium transition-colors ${on ? 'bg-[#1379f0] text-white' : 'bg-white dark:bg-[#1e1e2d] text-[#5e6278]'}`}>On</button>
        </div>
        <span className="text-[13px] font-medium">Segmented Toggle</span>
      </div>
    </div>
  )
}

function StepperDemo({ activeStep }: { activeStep: number }) {
  const steps = [
    { label: 'Business Information' },
    { label: 'Address Details' },
    { label: 'Confirmation' },
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
              <div className={`size-10 rounded-lg flex items-center justify-center text-[20px] font-semibold shrink-0 ${isCompleted ? 'bg-[#50cd89] text-white' : isActive ? 'bg-[#1379f0] text-white' : 'bg-[#f1f1f2] text-[#a1a5b7] dark:bg-[#2d2d3f]'}`}>
                {isCompleted ? <Check className="size-5" /> : stepNum}
              </div>
              <span className={`text-[14px] font-medium whitespace-nowrap ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-4 rounded ${isCompleted ? 'bg-[#50cd89]' : 'bg-[#e0e2e9] dark:bg-[#3f4254]'}`} />
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
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const today = 23

  return (
    <div className="bg-white dark:bg-[#1e1e2d] border rounded-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon-sm"><ChevronLeft className="size-4" /></Button>
        <span className="text-[13px] font-semibold">March 2025</span>
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
              className={`text-[13px] py-1.5 rounded-md cursor-pointer transition-colors ${isToday ? 'bg-[#1379f0] text-white font-semibold' : 'hover:bg-[#eef5ff] text-[#5e6278]'}`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

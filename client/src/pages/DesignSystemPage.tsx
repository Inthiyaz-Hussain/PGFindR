import * as React from 'react'
import {
  Button,
  Input,
  Select,
  Badge,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Modal,
  Spinner,
  Avatar,
  SkeletonCard, SkeletonList,
} from '@/components/ds'
import { Home as _Home, Search as _Search, MessageSquare as _Msg, Bell as _Bell, Trash2 as _Trash, Settings as _Settings } from 'lucide-react'

import { Navbar } from '@/components/layout/Navbar'

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [inputVal, setInputVal] = React.useState('')
  const [demoCity, setDemoCity] = React.useState('Bangalore')

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Live Sticky Navbar Preview */}
      <div className="mb-8">
        <Navbar
          brandName="SwiftPG"
          selectedCity={demoCity}
          onCityChange={setDemoCity}
          wishlistCount={3}
        />
      </div>

      <div className="px-4 max-w-4xl mx-auto space-y-14">
        <section>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight mb-1 text-foreground">
            SwiftPG Design System
          </h1>
          <p className="text-muted-foreground">Brand tokens, Navbar, + reusable components</p>
        </section>


      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="available">Available</Badge>
          <Badge variant="occupied">Occupied</Badge>
          <Badge variant="pending">Pending</Badge>
          <Badge variant="active">Active</Badge>
          <Badge variant="suspended">Suspended</Badge>
          <Badge variant="default">Default</Badge>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Inputs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full Name" placeholder="Rahul Sharma" value={inputVal} onChange={e => setInputVal(e.target.value)} helper="Enter your full name" />
          <Input label="Mobile" type="tel" placeholder="9876543210" />
          <Input label="Email" type="email" error="Invalid email address" />
          <Input label="Date" type="date" />
        </div>
      </section>

      {/* Select */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Select</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="PG Type"
            placeholder="Select type…"
            options={[
              { value: 'boys', label: 'Boys Only' },
              { value: 'girls', label: 'Girls Only' },
              { value: 'co-ed', label: 'Co-ed' },
            ]}
          />
          <Select
            label="City"
            placeholder="Select city…"
            error="City is required"
            options={[
              { value: 'bangalore', label: 'Bangalore' },
              { value: 'mumbai', label: 'Mumbai' },
            ]}
          />
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Cards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sunrise PG</CardTitle>
              <CardDescription>Koramangala, Bangalore</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">₹8,000–₹12,000 / month</p>
            </CardContent>
            <CardFooter>
              <Badge variant="available">3 beds free</Badge>
              <Button variant="primary" size="sm" className="ml-auto">View</Button>
            </CardFooter>
          </Card>
          <Card hoverable>
            <CardHeader>
              <CardTitle>Greenfields PG</CardTitle>
              <CardDescription>HSR Layout, Bangalore</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">₹6,500–₹10,000 / month</p>
            </CardContent>
            <CardFooter>
              <Badge variant="occupied">Full</Badge>
              <Button variant="outline" size="sm" className="ml-auto">Notify me</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Spinner + Avatar */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Spinner & Avatar</h2>
        <div className="flex flex-wrap items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <Avatar name="Rahul Sharma" size="sm" />
          <Avatar name="Priya Patel" size="md" />
          <Avatar name="Admin User" size="lg" />
          <Avatar name="XY" size="xl" />
          <Avatar src="https://github.com/shadcn.png" name="shadcn" size="md" />
        </div>
      </section>

      {/* Skeletons */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Skeletons</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonList rows={3} />
        </div>
      </section>

      {/* Modal */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Modal</h2>
        <Button variant="primary" onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Send Inquiry"
          description="Fill in your details to contact the PG owner."
        >
          <div className="space-y-4 mt-4">
            <Input label="Your Name" placeholder="Full name" />
            <Input label="Mobile" type="tel" placeholder="10-digit number" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary">Submit</Button>
            </div>
          </div>
        </Modal>
      </section>

      {/* Bottom nav preview */}
      <section className="space-y-4">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight border-b pb-2">Bottom Nav (mobile only)</h2>
        <p className="text-sm text-muted-foreground">Shown on screens narrower than md breakpoint (768px).</p>
      </section>
      </div>
    </div>
  )
}


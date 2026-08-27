import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function InvoicePage() {
  const { type, paymentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        const { data: payment, error: fetchErr } = await supabase
          .from('payments')
          .select(`
            *,
            booking:bookings(
              id,
              pg_id,
              room_id,
              bed_id,
              status,
              pg:pg_listings(name, address, city, state, pin_code),
              seeker:profiles!bookings_seeker_id_fkey(full_name, phone, email),
              owner:profiles!bookings_owner_id_fkey(full_name, phone, email)
            ),
            invoice:invoices(invoice_number, created_at)
          `)
          .eq('id', paymentId || '')
          .single()

        if (fetchErr || !payment) throw new Error('Payment not found')
        
        setData(payment)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (paymentId) {
      fetchInvoiceData()
    }
  }, [paymentId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <p className="text-red-500 font-medium">{error || 'Invoice not found'}</p>
        <Link to="/">
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    )
  }

  const { booking, invoice } = data
  const { pg, seeker, owner } = booking

  const invoiceNumber = invoice?.[0]?.invoice_number || `INV-${data.id.substring(0,8).toUpperCase()}`
  const invoiceDate = invoice?.[0]?.created_at ? new Date(invoice[0].created_at) : new Date(data.created_at)

  const isOwner = type === 'owner'

  // Calculations
  const rentAmount = data.amount - (data.platform_fee || 0) - (data.commission_amount || 0) - (data.service_charge || 0)

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Controls - Hidden in print */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Download PDF
          </Button>
        </div>

        {/* Invoice Paper */}
        <Card className="p-8 md:p-12 bg-white shadow-sm print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">FindPGRoom</h1>
              <p className="text-sm text-muted-foreground mt-1">Your Trusted PG Partner</p>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>123 Startup Hub, Tech Park</p>
                <p>Bangalore, Karnataka 560001</p>
                <p>support@findpgroom.com</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-800">
                {isOwner ? 'Payout Statement' : 'Invoice'}
              </h2>
              <div className="mt-4 text-sm space-y-1">
                <p><span className="font-medium text-gray-500">Invoice No:</span> {invoiceNumber}</p>
                <p><span className="font-medium text-gray-500">Date:</span> {format(invoiceDate, 'dd MMM yyyy')}</p>
                <p><span className="font-medium text-gray-500">Status:</span> <span className="text-green-600 font-medium uppercase">{data.status}</span></p>
              </div>
            </div>
          </div>

          {/* Billing Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                {isOwner ? 'Issued To (Owner)' : 'Billed To (Seeker)'}
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-gray-800 text-base">
                  {isOwner ? owner?.full_name : seeker?.full_name}
                </p>
                <p className="text-gray-600">{isOwner ? owner?.email : seeker?.email}</p>
                <p className="text-gray-600">{isOwner ? owner?.phone : seeker?.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Property Details</h3>
              <div className="text-sm space-y-1 flex flex-col items-end">
                <p className="font-semibold text-gray-800 text-base">{pg?.name}</p>
                <p className="text-gray-600 max-w-[250px]">{pg?.address}</p>
                <p className="text-gray-600">{pg?.city}, {pg?.state} {pg?.pin_code}</p>
                <p className="text-gray-500 text-xs mt-2">Booking ID: {booking?.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-8">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50/50">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Description</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!isOwner ? (
                  <>
                    <tr>
                      <td className="py-4 px-4 text-gray-800">
                        <div className="font-medium">Rent & Accommodation</div>
                        <div className="text-xs text-muted-foreground mt-1">Monthly rent for {pg?.name}</div>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-800">₹{rentAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    {(data.platform_fee > 0 || data.service_charge > 0) && (
                      <tr>
                        <td className="py-4 px-4 text-gray-800">
                          <div className="font-medium">Platform Fee & Taxes</div>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-800">
                          ₹{((data.platform_fee || 0) + (data.service_charge || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="py-4 px-4 text-gray-800">
                        <div className="font-medium">Rent Revenue</div>
                        <div className="text-xs text-muted-foreground mt-1">Tenant: {seeker?.full_name}</div>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-800">₹{rentAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </>
                )}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="py-4 px-4 text-right font-bold text-gray-800 text-base">
                    {isOwner ? 'Net Payable to Owner' : 'Total Amount Paid'}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-primary text-lg">
                    ₹{isOwner ? rentAmount.toLocaleString('en-IN') : data.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t text-center text-sm text-gray-500">
            <p>Thank you for choosing FindPGRoom.</p>
            <p className="mt-1">For any queries, please contact support@findpgroom.com</p>
            <p className="mt-4 text-xs">This is a computer generated document and does not require a signature.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

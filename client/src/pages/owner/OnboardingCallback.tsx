import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function OnboardingCallback() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [status, setStatus] = useState<'verifying' | 'writing' | 'completed'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isExecuting = useRef(false)

  useEffect(() => {
    async function processOnboarding() {
      if (isExecuting.current) return
      isExecuting.current = true

      try {
        // 1. Get current Google OAuth session
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr
        if (!session?.user) {
          setErrorMsg('Re-authentication failed. No active Google session.')
          return
        }

        // 2. Fetch the stored onboarding data
        const storedStr = localStorage.getItem('owner_onboarding_data')
        if (!storedStr) {
          setErrorMsg('No onboarding form data found in session.')
          setTimeout(() => navigate('/owner/onboarding'), 3000)
          return
        }

        const data = JSON.parse(storedStr)
        setStatus('writing')

        // 3. Update profiles table to set onboarding_verified = true
        const { error: profileErr } = await supabaseUntyped
          .from('profiles')
          .update({
            onboarding_verified: true,
            onboarding_verified_at: new Date().toISOString()
          })
          .eq('id', session.user.id)

        if (profileErr) throw profileErr

        // 4. Get the blank PG listing created during registration
        const { data: pg, error: pgFetchErr } = await supabaseUntyped
          .from('pg_listings')
          .select('id')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (pgFetchErr) throw pgFetchErr
        const pgId = pg.id

        // 5. Update PG listing with full basic details
        const { error: pgUpdateErr } = await supabaseUntyped
          .from('pg_listings')
          .update({
            name: data.pgDetails.name,
            description: data.pgDetails.description,
            address: data.pgDetails.address,
            city: data.pgDetails.city,
            locality: data.pgDetails.locality,
            pg_type: data.pgDetails.pg_type,
            deposit_amount: Number(data.pgDetails.deposit_amount) || 5000,
            rules: data.pgDetails.rules || '',
            status: 'pending', // Re-submit for review
            updated_at: new Date().toISOString()
          })
          .eq('id', pgId)

        if (pgUpdateErr) throw pgUpdateErr

        // 6. Setup Sharing Types & Rooms & Beds
        // Delete any existing room configurations to rebuild clean
        await supabaseUntyped.from('rooms').delete().eq('pg_id', pgId)
        await supabaseUntyped.from('beds').delete().eq('pg_id', pgId)

        for (const room of data.rooms) {
          // A. Find or insert sharing type
          const { data: sharingType, error: stErr } = await supabaseUntyped
            .from('sharing_types')
            .upsert({
              pg_id: pgId,
              type: room.sharing_type,
              price_monthly: room.beds[0]?.monthly_rent || 10000,
              total_beds: room.beds.length,
              occupied_beds: room.beds.filter((b: any) => b.status === 'occupied').length,
            }, { onConflict: 'pg_id,type' })
            .select('id')
            .single()

          if (stErr) throw stErr

          // B. Create room
          const { data: rm, error: rmErr } = await supabaseUntyped
            .from('rooms')
            .insert({
              pg_id: pgId,
              sharing_type_id: sharingType.id,
              room_label: room.room_label,
              floor: room.floor,
              door_facing: room.door_facing,
              has_window: room.has_window,
              window_facing: room.window_facing || null,
              window_count: room.window_count || null,
              room_size_sqft: room.room_size_sqft || null,
              room_notes: room.room_notes || null,
            })
            .select('id')
            .single()

          if (rmErr) throw rmErr

          // C. Create beds
          const sharingTypeLabel = room.sharing_type === 1 ? 'single' : room.sharing_type === 2 ? 'double' : room.sharing_type === 3 ? 'triple' : 'dormitory'
          const bedInserts = room.beds.map((bed: any) => ({
            pg_id: pgId,
            room_id: rm.id,
            room_number: room.room_label, // Legacy compatibility
            bed_label: bed.bed_label,
            sharing_type: sharingTypeLabel, // Legacy compatibility
            monthly_rent: bed.monthly_rent,
            status: bed.status,
            floor_number: room.floor, // Legacy compatibility
            has_ac: data.standardAmenities.ac || false, // Legacy compatibility
            has_attached_bath: false, // Legacy compatibility
            bed_type: bed.bed_type,
          }))

          const { error: bedErr } = await supabaseUntyped.from('beds').insert(bedInserts)
          if (bedErr) throw bedErr
        }

        // 7. Update Standard Amenities
        await supabaseUntyped.from('amenities').delete().eq('pg_id', pgId)
        const amenityInserts = Object.keys(data.standardAmenities)
          .filter(key => data.standardAmenities[key])
          .map(key => ({
            pg_id: pgId,
            key,
            is_available: true
          }))

        if (amenityInserts.length > 0) {
          const { error: amErr } = await supabaseUntyped.from('amenities').insert(amenityInserts)
          if (amErr) throw amErr
        }

        // 8. Insert Custom Amenities
        await supabaseUntyped.from('custom_amenities').delete().eq('pg_id', pgId)
        if (data.customAmenities.length > 0) {
          const customInserts = data.customAmenities.map((label: string) => ({
            pg_id: pgId,
            label,
            created_by: session.user.id
          }))
          const { error: custErr } = await supabaseUntyped.from('custom_amenities').insert(customInserts)
          if (custErr) throw custErr
        }

        // 9. Update KYC details
        const { error: kycErr } = await supabaseUntyped
          .from('owner_kyc')
          .upsert({
            owner_id: session.user.id,
            pan_number: data.kycDetails.pan_number,
            aadhaar_number: data.kycDetails.aadhaar_number,
            bank_account: data.kycDetails.bank_account,
            bank_ifsc: data.kycDetails.bank_ifsc,
            bank_name: data.kycDetails.bank_name,
            status: 'pending',
            updated_at: new Date().toISOString()
          }, { onConflict: 'owner_id' })

        if (kycErr) throw kycErr

        // 10. Update PG Listings photos list if any
        if (data.commonPhotos && data.commonPhotos.length > 0) {
          await supabaseUntyped.from('pg_photos').delete().eq('pg_id', pgId)
          const photoInserts = data.commonPhotos.map((url: string, index: number) => ({
            pg_id: pgId,
            url,
            is_primary: index === 0,
            sort_order: index,
            type: 'common'
          }))
          await supabaseUntyped.from('pg_photos').insert(photoInserts)
        }

        // 11. Cleanup and navigate to success state
        localStorage.removeItem('owner_onboarding_data')
        await refreshProfile()
        setStatus('completed')
        toast.success('Onboarding details submitted successfully!')
        
        setTimeout(() => {
          navigate('/owner/dashboard')
        }, 3000)
      } catch (err: any) {
        console.error('Onboarding callback error:', err)
        setErrorMsg(err.message || 'Verification write-back failed. Please try again.')
        setTimeout(() => navigate('/owner/onboarding'), 5000)
      }
    }

    processOnboarding()
  }, [navigate, refreshProfile])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col items-center gap-5">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <h2 className="text-xl font-semibold">Re-verifying Identity...</h2>
            <p className="text-sm text-muted-foreground font-medium">Validating Google active authentication session.</p>
          </>
        )}

        {status === 'writing' && (
          <>
            <Loader2 className="h-10 w-10 text-amber-600 dark:text-amber-400 animate-spin" />
            <h2 className="text-xl font-semibold">Submitting Onboarding Data...</h2>
            <p className="text-sm text-muted-foreground font-medium">Creating rooms, mapping bed grid values, and storing KYC documents.</p>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Submitted for Approval!</h2>
            <p className="text-sm text-muted-foreground">Your PG has been submitted for review. We will notify you within 48 hours.</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse mt-2">Redirecting to Dashboard...</p>
          </>
        )}

        {errorMsg && (
          <>
            <div className="text-red-500 font-semibold mb-2">Error during submission</div>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Scissors,
  Sparkles,
  Star,
} from 'lucide-react'
import hairBeforeAfter from './assets/hair-before-after.jpg'
import facialBeforeAfter from './assets/facial-before-after.jpg'
import makeoverBeforeAfter from './assets/makeover-before-after.jpg'
import nails from './assets/nails.jpg'
import salonChairs from './assets/salon-chairs.jpg'
import salonHero from './assets/salon-hero.jpg'
import salonInterior from './assets/salon-interior.jpg'
import salonLocation from './assets/salon-location.jpg'
import salonTeam from './assets/salon-team.jpg'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'

const services = [
  {
    title: 'Haircut & Styling',
    description:
      'Precision cuts and trend-forward styling tailored to your face shape and vibe.',
    image: salonHero,
    icon: Scissors,
  },
  {
    title: 'Hair Coloring / Balayage',
    description:
      'Luminous tones, dimensional balayage, and color correction with premium care.',
    image: salonChairs,
    icon: Palette,
  },
  {
    title: 'Nail Care',
    description:
      'Clean, elegant manicures and nail treatments for polished everyday confidence.',
    image: nails,
    icon: Heart,
  },
  {
    title: 'Facial & Skin Care',
    description:
      'Glow-boosting facials and skin rituals that refresh and deeply nourish.',
    image: salonInterior,
    icon: Sparkles,
  },
]

const testimonials = [
  {
    quote:
      'Best balayage I have ever had. The team listened to exactly what I wanted and nailed it.',
    name: 'Nica R.',
  },
  {
    quote:
      'The facial package made my skin look instantly brighter. Loved the relaxing atmosphere too.',
    name: 'Alyssa M.',
  },
  {
    quote:
      'I booked for nails and ended up trying the promo package. Totally worth it and super friendly staff.',
    name: 'Pat C.',
  },
]

const beforeAfterGallery = [
  { image: hairBeforeAfter, label: 'Hair Transformation' },
  { image: facialBeforeAfter, label: 'Facial Glow-Up' },
  { image: makeoverBeforeAfter, label: 'Complete Makeover' },
]

const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL || '/api/bookings'
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const FORM_MIN_FILL_MS = 4000
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 3
const LOCAL_RATE_LIMIT_KEY = 'glowup_booking_attempts'

const initialFormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  service: '',
  date: '',
  time: '',
  message: '',
  website: '',
}

function getRateLimitState() {
  const now = Date.now()

  try {
    const raw = localStorage.getItem(LOCAL_RATE_LIMIT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const recentAttempts = parsed.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

    return {
      isLimited: recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS,
      remainingMs:
        recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS
          ? RATE_LIMIT_WINDOW_MS - (now - recentAttempts[0])
          : 0,
      attempts: recentAttempts,
    }
  } catch {
    return { isLimited: false, remainingMs: 0, attempts: [] }
  }
}

function persistRateLimitAttempt(existingAttempts) {
  const attempts = [...existingAttempts, Date.now()]
  localStorage.setItem(LOCAL_RATE_LIMIT_KEY, JSON.stringify(attempts))
}

function getBusinessHours(dateString) {
  if (!dateString) {
    return { start: '09:00', end: '20:00', label: 'Mon-Sat 9:00-20:00, Sun 10:00-18:00' }
  }

  const day = new Date(`${dateString}T00:00:00`).getDay()
  if (day === 0) {
    return { start: '10:00', end: '18:00', label: 'Sunday hours: 10:00-18:00' }
  }

  return { start: '09:00', end: '20:00', label: 'Mon-Sat hours: 9:00-20:00' }
}

function normalizePhoneNumber(value) {
  return value.replace(/[\s-]/g, '')
}

function validateBookingForm(form, todayIso, maxDateIso) {
  const errors = {}

  if (form.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  const phone = normalizePhoneNumber(form.phoneNumber.trim())
  if (!/^(?:\+63|0)9\d{9}$/.test(phone)) {
    errors.phoneNumber = 'Use PH format: 09XXXXXXXXX or +639XXXXXXXXX.'
  }

  if (!form.service) {
    errors.service = 'Please select a service.'
  }

  if (!form.date) {
    errors.date = 'Please choose a booking date.'
  } else if (form.date < todayIso) {
    errors.date = 'Date cannot be in the past.'
  } else if (form.date > maxDateIso) {
    errors.date = 'Please choose a date within the next 90 days.'
  }

  if (!form.time) {
    errors.time = 'Please choose a booking time.'
  } else {
    const hours = getBusinessHours(form.date)
    if (form.time < hours.start || form.time > hours.end) {
      errors.time = `Selected time is outside business hours (${hours.label}).`
    }
  }

  return errors
}

function generateBookingId() {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().split('-')[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase()

  return `GLW-${Date.now().toString(36).toUpperCase()}-${randomPart}`
}

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (window.__turnstileScriptPromise) {
    return window.__turnstileScriptPromise
  }

  window.__turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Turnstile failed to load')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })

  return window.__turnstileScriptPromise
}

function getTimeUntilMidnight() {
  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)

  const diff = Math.max(0, nextMidnight.getTime() - now.getTime())
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { hours, minutes, seconds }
}

function App() {
  const isDev = import.meta.env.DEV
  const [bookingOpen, setBookingOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilMidnight())
  const [form, setForm] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmedName, setConfirmedName] = useState('')
  const [confirmedBookingId, setConfirmedBookingId] = useState('')
  const [pendingBookingId, setPendingBookingId] = useState('')
  const [canRetrySubmit, setCanRetrySubmit] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [toast, setToast] = useState({ open: false, message: '', tone: 'success' })
  const [bookingOpenedAt, setBookingOpenedAt] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileError, setTurnstileError] = useState('')
  const turnstileContainerRef = useRef(null)
  const turnstileWidgetIdRef = useRef(null)

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const maxDateIso = useMemo(() => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 90)
    return maxDate.toISOString().split('T')[0]
  }, [])
  const businessHours = useMemo(() => getBusinessHours(form.date), [form.date])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const ctaOpenBooking = () => {
    setBookingOpen(true)
    setBookingOpenedAt(Date.now())
    setTurnstileToken('')
    setTurnstileError('')
    setForm((previous) => ({ ...previous, website: '' }))
  }

  useEffect(() => {
    if (!toast.open) {
      return undefined
    }

    const timer = setTimeout(() => {
      setToast((previous) => ({ ...previous, open: false }))
    }, 3500)

    return () => clearTimeout(timer)
  }, [toast.open])

  useEffect(() => {
    if (!bookingOpen || !TURNSTILE_SITE_KEY) {
      return undefined
    }

    let mounted = true

    const initTurnstile = async () => {
      try {
        await loadTurnstileScript()

        if (!mounted || !window.turnstile || !turnstileContainerRef.current) {
          return
        }

        if (turnstileWidgetIdRef.current && window.turnstile.remove) {
          window.turnstile.remove(turnstileWidgetIdRef.current)
          turnstileWidgetIdRef.current = null
        }

        turnstileContainerRef.current.innerHTML = ''
        setTurnstileError('')

        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'light',
          callback: (token) => {
            setTurnstileToken(token)
            setTurnstileError('')
          },
          'error-callback': () => {
            setTurnstileToken('')
            setTurnstileError('Captcha verification failed. Please try again.')
          },
          'expired-callback': () => {
            setTurnstileToken('')
            setTurnstileError('Captcha expired. Please verify again.')
          },
        })
      } catch {
        setTurnstileError('Security check could not load. Refresh and try again.')
      }
    }

    initTurnstile()

    return () => {
      mounted = false

      if (window.turnstile && turnstileWidgetIdRef.current && window.turnstile.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current)
      }

      turnstileWidgetIdRef.current = null
    }
  }, [bookingOpen])

  const setFieldValue = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setValidationErrors((previous) => ({ ...previous, [field]: '' }))
    setSubmitError('')
    setCanRetrySubmit(false)
    setPendingBookingId('')
  }

  const submitBooking = async (payload) => {
    const startedAt = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(BOOKING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const textResult = await response.text()
      const parsedResult = textResult ? JSON.parse(textResult) : null

      if (!response.ok) {
        throw new Error(parsedResult?.message || 'Request failed')
      }

      if (!parsedResult || parsedResult.status !== 'success') {
        throw new Error('Unexpected booking API response')
      }

      return {
        bookingId: parsedResult.bookingId || payload.bookingId,
        durationMs: Math.round(performance.now() - startedAt),
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('timeout')
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const handleBookingSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const errors = validateBookingForm(form, todayIso, maxDateIso)
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      setSubmitError('Please fix the highlighted fields before submitting.')
      setCanRetrySubmit(false)
      return
    }

    const fillDuration = Date.now() - bookingOpenedAt
    if (fillDuration < FORM_MIN_FILL_MS) {
      setSubmitError('Please review your details for a few seconds before submitting.')
      return
    }

    if (form.website.trim()) {
      setSubmitError('Thanks! Your booking is being reviewed.')
      setToast({
        open: true,
        tone: 'success',
        message: 'Booking submitted successfully!',
      })
      setBookingOpen(false)
      setForm(initialFormState)
      return
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setTurnstileError('Please complete the security check.')
      setSubmitError('Please complete the security check before submitting.')
      return
    }

    const rateLimit = getRateLimitState()
    if (rateLimit.isLimited) {
      const minutes = Math.ceil(rateLimit.remainingMs / 60000)
      setSubmitError(`Too many attempts. Please wait about ${minutes} minute(s) and try again.`)
      return
    }

    setSubmitError('')
    setCanRetrySubmit(false)
    setIsSubmitting(true)

    const bookingId = pendingBookingId || generateBookingId()
    setPendingBookingId(bookingId)

    const messageWithId = [form.message.trim(), `Booking ID: ${bookingId}`]
      .filter(Boolean)
      .join('\n')

    const payload = {
      bookingId,
      name: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phoneNumber.trim(),
      service: form.service,
      date: form.date,
      time: form.time,
      message: messageWithId,
      captchaToken: turnstileToken,
    }

    try {
      await submitBooking(payload)
      persistRateLimitAttempt(rateLimit.attempts)

      setConfirmedName(payload.name)
      setConfirmedBookingId(bookingId)
      setForm(initialFormState)
      setPendingBookingId('')
      setTurnstileToken('')
      setBookingOpen(false)
      setConfirmOpen(true)

      setToast({
        open: true,
        tone: 'success',
        message: 'Booking submitted successfully!',
      })
    } catch (error) {
      const isTimeout = String(error?.message || '') === 'timeout'
      setCanRetrySubmit(isTimeout)

      setSubmitError(
        isTimeout
          ? 'Submission timed out. Please try again in a few seconds.'
          : 'Could not submit your booking. Please try again.',
      )

      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current)
        setTurnstileToken('')
      }

      console.error('Booking submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetrySubmit = async () => {
    if (isSubmitting) {
      return
    }

    const eventLikeObject = { preventDefault: () => {} }
    await handleBookingSubmit(eventLikeObject)
  }

  const thankYouName = useMemo(
    () => confirmedName || form.fullName.trim() || 'Beautiful Client',
    [confirmedName, form.fullName],
  )

  return (
    <div className="bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <a href="#" className="font-heading text-xl font-bold tracking-tight text-salon-dark hover:text-primary transition">
            GlowUp Salon
          </a>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden gap-6 md:flex">
              <a href="#services" className="text-sm font-semibold text-salon-dark hover:text-primary transition">
                Services
              </a>
              <a href="#team" className="text-sm font-semibold text-salon-dark hover:text-primary transition">
                Team
              </a>
              <a href="#location" className="text-sm font-semibold text-salon-dark hover:text-primary transition">
                Location
              </a>
            </nav>
            <Button className="animate-pulse-glow" onClick={ctaOpenBooking}>
              Book Now
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div className="space-y-7 animate-fade-in-up">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              Rated 4.9 by 500+ Clients
            </p>
            <h1 className="font-heading text-5xl font-bold leading-tight text-salon-dark md:text-6xl">
              Get the Look You Deserve
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Hair • Nails • Facial • Makeover — All in One Place
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="animate-pulse-glow" onClick={ctaOpenBooking}>
                Book Appointment Now
              </Button>
              <Button onClick={ctaOpenBooking} variant="outline">
                Get 20% Off First Visit
              </Button>
            </div>
          </div>

          <div className="relative animate-fade-in-up-delayed">
            <img
              src={salonHero}
              alt="Glamorous salon styling session"
              className="h-full w-full rounded-3xl object-cover shadow-[0_35px_70px_rgba(45,28,61,0.25)]"
            />
            <Card className="absolute -bottom-6 -left-4 w-52 border-none bg-white/85 shadow-xl backdrop-blur md:-left-8">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-1 text-salon-gold">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-salon-dark">500+ Happy Clients</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-salon-dark py-16 md:py-20">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/20 bg-white/10 px-6 py-10 text-white shadow-xl backdrop-blur-md md:px-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-salon-gold">
              Limited-Time Salon Promo
            </p>
            <h2 className="font-heading text-4xl font-bold">Exclusive Package Deal</h2>
            <div className="mt-7 space-y-3">
              {['Hair Treatment + Haircut', 'FREE Hair Consultation', 'FREE Scalp Analysis'].map((item) => (
                <p key={item} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                  <Check className="h-5 w-5 text-salon-gold" />
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-8 font-heading text-4xl font-bold text-salon-gold md:text-5xl">
              <span className="mr-2 text-2xl text-white/60 line-through">₱1,500</span>₱799
            </p>
            <p className="mt-1 text-sm uppercase tracking-[0.24em] text-white/75">Today Only</p>
              <Button
                className="mt-8 bg-salon-gold text-salon-dark hover:bg-salon-gold/90"
                onClick={ctaOpenBooking}
              >
                Claim Your Discount
              </Button>
          </div>
        </section>

        <section className="bg-secondary py-16 md:py-20">
          <div className="mx-auto max-w-7xl space-y-12 px-4 md:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="border-none bg-white/85 backdrop-blur">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-1 text-salon-gold">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">“{testimonial.quote}”</p>
                    <p className="font-semibold text-salon-dark">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {beforeAfterGallery.map((item) => (
                <div key={item.label} className="overflow-hidden rounded-2xl bg-white shadow-lg">
                  <img
                    src={item.image}
                    alt={item.label}
                    className="h-56 w-full object-cover"
                  />
                  <p className="px-4 py-3 text-sm font-semibold text-salon-dark">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="font-heading text-center text-4xl font-bold text-salon-dark">
              Signature Services
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon
                return (
                  <Card key={service.title} className="group overflow-hidden border-none bg-white shadow-lg">
                    <div className="overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="space-y-3 p-5">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="font-heading text-2xl font-semibold text-salon-dark">
                        {service.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <Button onClick={ctaOpenBooking} className="mt-2 w-full">
                        Book Now
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-muted py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center md:px-8">
            <h2 className="font-heading text-4xl font-bold text-salon-dark">How It Works</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                '1. Choose service',
                '2. Book schedule',
                '3. Visit salon',
                '4. Glow up',
              ].map((step) => (
                <Card key={step} className="border-none bg-white">
                  <CardContent className="flex min-h-36 items-center justify-center p-5 text-lg font-semibold text-salon-dark">
                    {step}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={ctaOpenBooking} className="mt-8">
              Reserve Your Slot
            </Button>
          </div>
        </section>

        <section className="bg-salon-dark py-16 text-white md:py-20">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center md:px-8">
            <p className="inline-flex animate-pulse rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-salon-gold">
              Limited Availability
            </p>
            <h2 className="font-heading text-4xl font-bold">Only 10 Slots Left Today</h2>
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-3">
              {[
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Seconds', value: timeLeft.seconds },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur"
                >
                  <p className="font-heading text-4xl font-bold text-salon-gold">
                    {String(item.value).padStart(2, '0')}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
            <Button
              className="animate-pulse-glow bg-salon-gold text-salon-dark hover:bg-salon-gold/90"
              onClick={ctaOpenBooking}
            >
              Secure My Slot
            </Button>
          </div>
        </section>

        <section id="team" className="py-16 md:py-20">
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <h2 className="mb-8 text-center font-heading text-4xl font-bold text-salon-dark">
              Meet Our Team
            </h2>
            <div className="overflow-hidden rounded-3xl shadow-xl">
              <img
                src={salonTeam}
                alt="GlowUp Salon team"
                className="aspect-video w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section id="location" className="bg-secondary py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:items-center md:px-8">
            <Card className="border-none bg-white/80 backdrop-blur">
              <CardContent className="space-y-5 p-7">
                <h2 className="font-heading text-4xl font-bold text-salon-dark">Location & Contact</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    123 Beauty Street, BGC, Taguig City
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-primary" />
                    +63 917 123 4567
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Mon-Sat 9AM-8PM, Sun 10AM-6PM
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={ctaOpenBooking}>Book Now</Button>
                  <a
                    href="https://www.facebook.com/johntadeo.liscano.3"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                  >
                    Message Us
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-3xl shadow-xl">
              <img
                src={salonLocation}
                alt="GlowUp Salon exterior and location"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-salon-dark px-4 py-7 text-center text-sm text-white/80 md:px-8">
        © 2026 GlowUp Salon. Johntadeo Liscano
      </footer>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl">Book Your Appointment</DialogTitle>
            <DialogDescription>
              Fill in your details and we will send your booking to our team instantly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(event) => setFieldValue('fullName', event.target.value)}
                placeholder="Enter your full name"
              />
              {validationErrors.fullName && (
                <p className="text-xs font-medium text-red-600">{validationErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setFieldValue('email', event.target.value)}
                placeholder="you@example.com"
              />
              {validationErrors.email && (
                <p className="text-xs font-medium text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                required
                value={form.phoneNumber}
                onChange={(event) => setFieldValue('phoneNumber', event.target.value)}
                placeholder="e.g. +63 917 123 4567"
              />
              {validationErrors.phoneNumber && (
                <p className="text-xs font-medium text-red-600">{validationErrors.phoneNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={form.service}
                onValueChange={(value) => setFieldValue('service', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Haircut & Styling">Haircut & Styling</SelectItem>
                  <SelectItem value="Hair Coloring / Balayage">
                    Hair Coloring / Balayage
                  </SelectItem>
                  <SelectItem value="Nail Care">Nail Care</SelectItem>
                  <SelectItem value="Facial & Skin Care">Facial & Skin Care</SelectItem>
                  <SelectItem value="₱799 Promo Package">₱799 Promo Package</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.service && (
                <p className="text-xs font-medium text-red-600">{validationErrors.service}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  min={todayIso}
                  max={maxDateIso}
                  value={form.date}
                  onChange={(event) => setFieldValue('date', event.target.value)}
                />
                {validationErrors.date && (
                  <p className="text-xs font-medium text-red-600">{validationErrors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  min={businessHours.start}
                  max={businessHours.end}
                  value={form.time}
                  onChange={(event) => setFieldValue('time', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">{businessHours.label}</p>
                {validationErrors.time && (
                  <p className="text-xs font-medium text-red-600">{validationErrors.time}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                rows={4}
                maxLength={500}
                value={form.message}
                onChange={(event) => setFieldValue('message', event.target.value)}
                placeholder="Tell us any special request..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Max 500 characters.</p>
            </div>

            <div className="space-y-2">
              <Label>Security Check</Label>
              {TURNSTILE_SITE_KEY ? (
                <div
                  ref={turnstileContainerRef}
                  className="min-h-[65px] rounded-md border border-input bg-background p-2"
                />
              ) : (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Captcha is not configured yet. Add VITE_TURNSTILE_SITE_KEY in your environment.
                </p>
              )}
              {turnstileError && <p className="text-xs font-medium text-red-600">{turnstileError}</p>}
            </div>

            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => setFieldValue('website', event.target.value)}
              />
            </div>

            {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

            {canRetrySubmit && (
              <Button type="button" variant="outline" className="w-full" onClick={handleRetrySubmit}>
                Retry Submission
              </Button>
            )}

            <div className="sticky bottom-0 bg-background pb-1 pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl">🎉 Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Thank you, {thankYouName}! We cannot wait to welcome you to GlowUp Salon.
            </DialogDescription>
          </DialogHeader>

          {confirmedBookingId && (
            <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs font-semibold tracking-wide text-salon-dark">
              Booking ID: {confirmedBookingId}
            </p>
          )}

          <div className="rounded-2xl border border-salon-gold/40 bg-salon-gold/10 p-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-salon-dark">
              Add-On Specials
            </p>
            <ul className="space-y-2 text-sm text-salon-dark">
              <li>Hair Spa ₱299</li>
              <li>Nail Art ₱199</li>
              <li>Deep Facial ₱399</li>
            </ul>
          </div>

          <Button onClick={() => setConfirmOpen(false)} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {toast.open && (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.tone === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App

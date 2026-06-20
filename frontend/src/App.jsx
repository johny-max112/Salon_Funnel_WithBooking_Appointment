import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Briefcase,
  Phone,
  Shield,
  TrendingUp,
  Star,
  Coins,
  X, // Added X icon for closing modal
} from 'lucide-react'
// --- Updated Image Imports gamit ang mga sinend mong files ---
// --- Updated Image Imports papunta sa assets/img folder ---
import profileHero from './assets/img/712339617_122209174760550844_8189883226454812305_n.jpg'
import lifeInsuranceImg from './assets/img/500315742_122158217000550844_4389644056328016710_n.jpg'
import investmentImg from './assets/img/500318142_122158216958550844_7660625936708921150_n.jpg'
import educationPlanningImg from './assets/img/500460678_122158217042550844_8350141099064345942_n.jpg'
import retirementImg from './assets/img/506469638_122162744360550844_3052240577453925018_n.jpg'
import awardCertificate from './assets/img/564131090_122180623424550844_3648536655295935739_n.jpg'
import groupTeam from './assets/img/717417436_122210012234550844_1314182099303458599_n.jpg'
import speakingEngagement from './assets/img/720457506_122210226878550844_455256436066308704_n.jpg'
import officeBgc from './assets/img/723118625_122210853782550844_8731312097391854869_n.jpg'
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
    title: 'Wealth Management & Investments',
    description:
      'Diversified asset allocation and personalized risk management strategies to help build and sustain your capital growth over time.',
    image: investmentImg,
    icon: TrendingUp,
  },
  {
    title: 'Retirement Planning',
    description:
      'Map out a clear and highly stable cashflow layout ensuring you enjoy your post-career life with absolute security and zero stress.',
    image: retirementImg,
    icon: Coins,
  },
  {
    title: 'Income Protection & Health Insurance',
    description:
      "Full-spectrum safety nets, critical illness shielding, and custom insurance frameworks designed to safeguard your family from life's surprises.",
    image: lifeInsuranceImg,
    icon: Shield,
  },
  {
    title: 'Estate Planning & Corporate Mapping',
    description:
      'Ensure clear generational wealth structures, corporate legal protection strategies, and efficient legacy protection.',
    image: educationPlanningImg,
    icon: Briefcase,
  },
]

const testimonials = [
  {
    quote:
      'Jo restructured my portfolio perfectly during my career transition. His strategy gave me the long-term clarity I desperately needed.',
    name: 'Nica R., Tech Lead',
  },
  {
    quote:
      'The comprehensive custom retirement roadmap Jo built gave my family instant peace of mind. Highly professional and deeply analytical.',
    name: 'Alyssa M., Entrepreneur',
  },
  {
    quote:
      'I initially came in just seeking simple health insurance options but ended up designing a full wealth plan. Accessible and incredibly smart!',
    name: 'Pat C., Business Owner',
  },
]

const beforeAfterGallery = [
  { image: awardCertificate, label: 'Recognized Excellence & Credentials' },
  { image: speakingEngagement, label: 'Financial Literacy Seminars & Talks' },
  { image: groupTeam, label: 'Collaborative Strategy and Team Network' },
]

const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL || '/api/bookings'
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const FORM_MIN_FILL_MS = 4000
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 3
const LOCAL_RATE_LIMIT_KEY = 'jo_abulog_booking_attempts'

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
    return { start: '09:00', end: '18:00', label: 'Mon-Fri 9:00-18:00, Sat 10:00-16:00 (Closed Sundays)' }
  }
  const day = new Date(`${dateString}T00:00:00`).getDay()
  if (day === 0) {
    return { start: '00:00', end: '00:00', label: 'Closed on Sundays' }
  }
  if (day === 6) {
    return { start: '10:00', end: '16:00', label: 'Saturday hours: 10:00-16:00' }
  }
  return { start: '09:00', end: '18:00', label: 'Weekday hours: 9:00-18:00' }
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
    errors.service = 'Please select an advisory focus.'
  }
  if (!form.date) {
    errors.date = 'Please choose a consultation date.'
  } else if (form.date < todayIso) {
    errors.date = 'Date cannot be in the past.'
  } else if (form.date > maxDateIso) {
    errors.date = 'Please choose a date within the next 90 days.'
  }
  if (!form.time) {
    errors.time = 'Please choose a session slot.'
  } else {
    const hours = getBusinessHours(form.date)
    if (hours.start === '00:00' && hours.end === '00:00') {
      errors.date = 'Consultations are unavailable on Sundays.'
    } else if (form.time < hours.start || form.time > hours.end) {
      errors.time = `Selected time is outside advisor availability (${hours.label}).`
    }
  }
  return errors
}

function generateBookingId() {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().split('-')[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase()
  return `ADV-${Date.now().toString(36).toUpperCase()}-${randomPart}`
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

export default function App() {
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
  const [selectedImage, setSelectedImage] = useState(null) // Renamed for clarity if it was used before, now specific to hero
  const [isImageModalOpen, setIsImageModalOpen] = useState(false) // New state for image modal
  const [selectedImageForModal, setSelectedImageForModal] = useState('') // New state for image src in modal

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

  // Function to open image modal
  const openImageModal = (imageSrc) => {
    setSelectedImageForModal(imageSrc)
    setIsImageModalOpen(true)
  }

  useEffect(() => {
    if (!toast.open) return undefined
    const timer = setTimeout(() => {
      setToast((previous) => ({ ...previous, open: false }))
    }, 3500)
    return () => clearTimeout(timer)
  }, [toast.open])

  useEffect(() => {
    if (!bookingOpen || !TURNSTILE_SITE_KEY) return undefined
    let mounted = true
    const initTurnstile = async () => {
      try {
        await loadTurnstileScript()
        if (!mounted || !window.turnstile || !turnstileContainerRef.current) return
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
        headers: { 'Content-Type': 'application/json' },
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
      if (error.name === 'AbortError') throw new Error('timeout')
      throw error
    } finally { // Changed from block scope to finally to ensure cleanup
      clearTimeout(timeoutId)
    }
  }

  const handleBookingSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

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
      setSubmitError('Thanks! Your profile is being reviewed.')
      setToast({
        open: true,
        tone: 'success',
        message: 'Strategy request submitted successfully!',
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

    const messageWithId = [form.message.trim(), `Session ID: ${bookingId}`]
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
        message: 'Consultation request submitted successfully!',
      })
    } catch (error) {
      const isTimeout = String(error?.message || '') === 'timeout'
      setCanRetrySubmit(isTimeout)
      setSubmitError(
        isTimeout
          ? 'Submission timed out. Please try again in a few seconds.'
          : 'Could not submit your request. Please try again.',
      )
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current)
        setTurnstileToken('')
      }
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetrySubmit = async () => {
    if (isSubmitting) return
    const eventLikeObject = { preventDefault: () => {} }
    await handleBookingSubmit(eventLikeObject)
  }

  const thankYouName = useMemo(
    () => confirmedName || form.fullName.trim() || 'Valued Client',
    [confirmedName, form.fullName],
  )

  return (
    <div className="bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <a href="#" className="font-heading text-xl font-bold tracking-tight text-slate-900 hover:text-primary transition">
            Jo Abulog <span className="block text-xs font-medium text-primary md:inline-block md:ml-2">Licensed Financial Advisor</span>
          </a>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden gap-6 md:flex">
              <a href="#services" className="text-sm font-semibold text-muted-foreground hover:text-primary transition">
                Advisory Services
              </a>
              <a href="#process" className="text-sm font-semibold text-muted-foreground hover:text-primary transition">
                How It Works
              </a>
              <a href="#location" className="text-sm font-semibold text-muted-foreground hover:text-primary transition">
                Office & Contact
              </a>
            </nav>
            <Button className="animate-pulse-glow" onClick={ctaOpenBooking}>
              Schedule Call
            </Button>
          </div>
        </div>
      </nav>
      <main>
        {/* HERO SECTION */}
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div className="space-y-7 animate-fade-in-up">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              Licensed Financial Advisor • 500+ Clients Guided
            </p>
            <h1 className="font-heading text-5xl font-bold leading-tight text-slate-900 md:text-6xl">
              Get the Financial Peace You Deserve
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Jo Abulog, a dedicated Sun Life Financial Advisor with Phoenix Palm Empire, specializes in Wealth Strategy • Retirement Planning • Protection Mapping — Tailored Perfectly to Your Goals.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="animate-pulse-glow" onClick={ctaOpenBooking}>
                Book Free Consultation Now
              </Button>
              <Button onClick={ctaOpenBooking} variant="outline">
                Claim Free Portfolio Audit
              </Button>
            </div>
          </div>
          <div className="relative animate-fade-in-up-delayed">
            <img
              src={profileHero}
              alt="Jo Abulog - Financial Advisor"
              className="h-[500px] w-full rounded-3xl object-cover shadow-[0_35px_70px_rgba(15,23,42,0.15)]"
            />
            <Card className="absolute -bottom-6 -left-4 w-52 border-none bg-white/85 shadow-xl backdrop-blur md:-left-8">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-slate-900">100% Approachable Fiduciary</p>
              </CardContent>
            </Card>
          </div>
        </section>
        {/* PROMO SECTION */}
        <section className="bg-slate-900 py-16 md:py-20">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/20 bg-white/5 px-6 py-10 text-white shadow-xl backdrop-blur-md md:px-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              Limited-Time Strategic Promo
            </p>
            <h2 className="font-heading text-4xl font-bold">Comprehensive Wealth Audit</h2>
            <div className="mt-7 space-y-3">
              {['Custom Cashflow Analysis Blueprint', 'FREE 1-on-1 Strategy Alignment Session', 'Comprehensive Risk & Insurance Stress Testing'].map((item) => (
                <p key={item} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                  <Check className="h-5 w-5 text-amber-400" />
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-8 font-heading text-4xl font-bold text-amber-400 md:text-5xl">
              <span className="mr-2 text-2xl text-white/60 line-through">₱2,500</span>FREE
            </p>
            <p className="mt-1 text-sm uppercase tracking-[0.24em] text-white/75">Exclusive Monthly Slots</p>
            <Button
              className="mt-8 bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={ctaOpenBooking}
            >
              Claim Your Free Strategy Audit
            </Button>
          </div>
        </section>
        {/* TESTIMONIALS & CREDENTIALS GALLERY */}
        <section className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl space-y-12 px-4 md:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="border-none bg-white shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">“{testimonial.quote}”</p>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {beforeAfterGallery.map((item) => (
                <div
                  key={item.label}
                  className="group overflow-hidden rounded-2xl bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  onClick={() => openImageModal(item.image)} // Added onClick handler
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <p className="px-4 py-3 text-sm font-semibold text-slate-900">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* SERVICES SECTION */}
        <section id="services" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="font-heading text-center text-4xl font-bold text-slate-900">
              Signature Advisory Services
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
                      <h3 className="font-heading text-2xl font-semibold text-slate-900">
                        {service.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <Button onClick={ctaOpenBooking} className="mt-2 w-full">
                        Inquire Details
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
        {/* PROCESS SECTION */}
        <section id="process" className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center md:px-8">
            <h2 className="font-heading text-4xl font-bold text-slate-900">How It Works</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                '1. Introductory Call',
                '2. Strategy Mapping',
                '3. Custom Deployment',
                '4. Portfolio Reviews',
              ].map((step) => (
                <Card key={step} className="border-none bg-white shadow-sm">
                  <CardContent className="flex min-h-36 items-center justify-center p-5 text-lg font-semibold text-slate-900">
                    {step}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={ctaOpenBooking} className="mt-8">
              Reserve Strategy Window
            </Button>
          </div>
        </section>
        {/* TIMER/COUNTDOWN SECTION */}
        <section className="bg-slate-900 py-16 text-white md:py-20">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center md:px-8">
            <p className="inline-flex animate-pulse rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-amber-400">
              Limited Availability Monthly
            </p>
            <h2 className="font-heading text-4xl font-bold">Only 10 Strategy Slots Left This Month</h2>
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
                  <p className="font-heading text-4xl font-bold text-amber-400">
                    {String(item.value).padStart(2, '0')}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
            <Button
              className="animate-pulse-glow bg-amber-400 text-slate-950 hover:bg-amber-300"
              onClick={ctaOpenBooking}
            >
              Secure My Strategy Consultation
            </Button>
          </div>
        </section>
        {/* OFFICE & CONTACT LOCATION */}
        <section id="location" className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:items-center md:px-8">
            <Card className="border-none bg-white shadow-sm">
              <CardContent className="space-y-5 p-7">
                <h2 className="font-heading text-4xl font-bold text-slate-900">Office & Contact</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    Bonifacio Global City (BGC), Taguig City, Philippines
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-primary" />
                    +63 917 128 2812
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Mon-Fri 9AM-6PM, Sat 10AM-4PM (By Appointment)
                  </p>
                  <p className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-primary" /> {/* Using Heart icon as an example for email, can be changed */}
                    sunlifejourney97@gmail.com
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={ctaOpenBooking}>Book Consultation</Button>
                  <a
                    href="https://www.facebook.com/profile.php?id=61566525345780"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                  >
                    Direct Message
                  </a>
                </div>
              </CardContent>
            </Card>
            <div className="overflow-hidden rounded-3xl shadow-md">
              <img
                src={officeBgc}
                alt="Corporate Advisory Office Location sa BGC"
                className="h-96 w-full object-cover"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-slate-950 px-4 py-7 text-center text-sm text-white/60 md:px-8">
        © 2026 Jo Abulog Financial Advisory Services. All rights reserved.
        <p className="mt-2 text-xs">
          Jo Abulog is a Licensed Financial Advisor with Sun Life of Canada (Philippines), Inc., affiliated with Phoenix Palm Empire.
          <br />
          Licensed since November 10, 2024.
          <br />
          This website is for informational purposes only and does not constitute financial advice. Investments are not guaranteed and are subject to market risks.
          <br />
          Please consult Sun Life's official website or a qualified professional for detailed product information.
          <br />
          <a href="#" className="text-primary hover:underline">Privacy Policy</a> | <a href="#" className="text-primary hover:underline">Terms of Service</a>
        </p>
      </footer>
      {/* BOOKING MODAL/DIALOG FORM */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl">Request Strategy Call</DialogTitle>
            <DialogDescription>
              Fill in your contact parameters to sync an initial financial assessment request.
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
                placeholder="e.g. +63 917 128 2812"
              />
              {validationErrors.phoneNumber && (
                <p className="text-xs font-medium text-red-600">{validationErrors.phoneNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Primary Advisory Focus</Label>
              <Select
                value={form.service}
                onValueChange={(value) => setFieldValue('service', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisory goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wealth Management & Investments">Wealth Management & Investments</SelectItem>
                  <SelectItem value="Retirement Planning">Retirement Planning</SelectItem>
                  <SelectItem value="Income Protection & Health Insurance">Income Protection & Health Insurance</SelectItem>
                  <SelectItem value="Estate Planning & Corporate Mapping">Estate Planning & Corporate Mapping</SelectItem>
                  <SelectItem value="Free Strategy Package">Free Strategy Package</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.service && (
                <p className="text-xs font-medium text-red-600">{validationErrors.service}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                <Label htmlFor="time">Preferred Time</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={form.time}
                  onChange={(event) => setFieldValue('time', event.target.value)}
                />
                {validationErrors.time && (
                  <p className="text-xs font-medium text-red-600">{validationErrors.time}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Additional Notes (Optional)</Label>
              <Input
                id="message"
                value={form.message}
                onChange={(event) => setFieldValue('message', event.target.value)}
                placeholder="Share any specific goals..."
              />
            </div>
            {/* Turnstile Captcha Container */}
            {TURNSTILE_SITE_KEY && (
              <div className="flex flex-col items-center justify-center py-2">
                <div ref={turnstileContainerRef}></div>
                {turnstileError && (
                  <p className="mt-1 text-xs font-medium text-red-600">{turnstileError}</p>
                )}
              </div>
            )}
            {submitError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                <p>{submitError}</p>
                {canRetrySubmit && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-red-700 underline"
                    onClick={handleRetrySubmit}
                  >
                    Try Resubmitting
                  </Button>
                )}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Assessment Request'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG MODAL */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-slate-900">Request Received!</DialogTitle>
            <DialogDescription>
              Thank you, <span className="font-semibold text-slate-900">{thankYouName}</span>. Your initial financial advisory inquiry has been securely routed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground border border-slate-100">
            <p>
              <span className="font-semibold text-slate-900">Tracking Reference:</span>{' '}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono text-slate-800">
                {confirmedBookingId}
              </code>
            </p>
            <p>Isesend namin ang detalyadong verification checklist sa iyong email para sa ating call scheduling validation.</p>
          </div>
          <Button onClick={() => setConfirmOpen(false)} className="w-full">
            Understood
          </Button>
        </DialogContent>
      </Dialog>

      {/* IMAGE VIEW MODAL */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-[800px] p-0 overflow-hidden rounded-lg">
          <div className="relative w-full h-full">
            <img
              src={selectedImageForModal}
              alt="Enlarged view"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
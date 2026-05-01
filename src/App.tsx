import React, { useEffect, useId, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import { Truck, CheckCircle2, ChevronRight, X, Plus, Minus, Trash2, ShieldCheck } from 'lucide-react';

const NinjaIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <defs>
      <mask id="ninja-eye-mask">
        <rect width="100%" height="100%" fill="white" />
        <rect x="7" y="9" width="12" height="6" rx="3" fill="black" />
      </mask>
    </defs>

    <g mask="url(#ninja-eye-mask)">
      <circle cx="13" cy="12" r="9" />
      <path d="M5,11 C2,9 1,6 1,6 C3,7 5,9 5.5,10.5 Z" />
      <path d="M5,13 C2,15 1,18 1,18 C3,17 5,15 5.5,13.5 Z" />
    </g>

    <circle cx="10.5" cy="12" r="1.25" fill="currentColor" />
    <circle cx="15.5" cy="12" r="1.25" fill="currentColor" />
  </svg>
);

type ItemKind = 'couch' | 'mattress' | 'fridge' | 'washer' | 'tv' | 'pile';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Item = {
  id: string;
  name: string;
  price: number;
  description: string;
  kind: ItemKind;
  loadFill?: number;
  volumeLabel?: string;
};

type ServiceStatus = 'idle' | 'in' | 'out';

type BookingPhotoPayload = {
  name: string;
  type: string;
  data: string;
};

type CheckoutForm = {
  customerName: string;
  phone: string;
  address: string;
  pickupDate: string;
  pickupWindow: string;
};

type AvailabilityWindow = {
  id: string;
  label: string;
  available: boolean;
};

const defaultPickupWindows: AvailabilityWindow[] = [
  { id: '8am-12pm', label: '8:00 AM - 12:00 PM', available: true },
  { id: '12pm-4pm', label: '12:00 PM - 4:00 PM', available: true },
  { id: '4pm-8pm', label: '4:00 PM - 8:00 PM', available: true },
];

const QUICK_ITEMS: Item[] = [
  { id: 'couch', name: 'Standard Couch', price: 95, description: 'Sofa, loveseat, or sectional piece.', kind: 'couch' },
  { id: 'mattress', name: 'Mattress & Box Spring', price: 95, description: 'Any standard mattress size, curbside ready.', kind: 'mattress' },
  { id: 'fridge', name: 'Refrigerator', price: 110, description: 'Garage or kitchen unit with clear access.', kind: 'fridge' },
  { id: 'washer_dryer', name: 'Washer/Dryer Set', price: 120, description: 'Laundry pair, disconnected and ready.', kind: 'washer' },
  { id: 'tv', name: 'Large TV', price: 85, description: 'Flat screen, console TV, or projector display.', kind: 'tv' },
];

const VOLUME_PILES: Item[] = [
  { id: 'vol_min', name: 'Minimum Pile', price: 99, description: 'About 1/8 of a 12x8 enclosed trailer.', kind: 'pile', loadFill: 13, volumeLabel: '1/8' },
  { id: 'vol_small', name: 'Small Pile', price: 149, description: 'About 1/4 trailer: closet or small garage cleanout.', kind: 'pile', loadFill: 25, volumeLabel: '1/4' },
  { id: 'vol_med', name: 'Medium Pile', price: 289, description: 'About 1/2 trailer: multi-room cleanout.', kind: 'pile', loadFill: 50, volumeLabel: '1/2' },
  { id: 'vol_large', name: 'Heavy Haul', price: 549, description: 'Full 12x8 trailer: renovation debris or large cleanout.', kind: 'pile', loadFill: 100, volumeLabel: 'FULL' },
];

const TRUST_ITEMS = [
  { title: 'Insured Crew', body: 'Uniformed pickup team with careful curb-to-truck handling.', Icon: ShieldCheck },
  { title: 'Text Updates', body: 'Arrival window and completion confirmation sent by phone.', Icon: CheckCircle2 },
  { title: 'Flat Pricing', body: 'Your selected haul price stays visible before checkout.', Icon: Truck },
];

const HOW_IT_WORKS = [
  { title: 'Choose Your Haul', body: 'Pick individual items or estimate the trailer space your pile will use.' },
  { title: 'Set The Window', body: 'Enter your address, upload a photo if helpful, and choose a 4-hour pickup window.' },
  { title: 'Leave It Curbside', body: 'Place items on the curb or driveway before the crew arrives. No contact required.' },
  { title: 'We Clear It Out', body: 'You get text updates, a cleared curb, and a simple final confirmation.' },
];

const FAQS = [
  {
    question: 'Do I need to be home for pickup?',
    answer: 'No. As long as the items are accessible from the curb, driveway, garage opening, or another approved pickup spot, the crew can complete the haul without contact.',
  },
  {
    question: 'What if my pile is bigger than the volume I selected?',
    answer: 'Upload a photo when booking if you are unsure. If the load is clearly larger on arrival, the crew can confirm the right volume tier before hauling anything.',
  },
  {
    question: 'Can you pick up inside the house?',
    answer: 'The standard pricing is built around curbside or easy-access pickup. Interior removals may require the heavy lifting add-on or a custom quote depending on stairs, distance, and item weight.',
  },
  {
    question: 'What items are not accepted?',
    answer: 'We do not take hazardous materials like paint, chemicals, fuel, oil tanks, or regulated waste. If you are not sure, send a photo or note with the booking.',
  },
  {
    question: 'How fast can you pick up?',
    answer: 'Standard bookings are built around a 24-hour pickup window. Same-day rush pickup is available as an add-on when scheduling capacity allows.',
  },
  {
    question: 'How does payment work?',
    answer: 'The site shows an estimated total before checkout. In a production setup, payment would be collected securely through checkout or confirmed after a custom quote.',
  },
];

const SERVICE_ZIPS = new Set([
  '75001', '75006', '75007', '75019', '75024', '75025', '75028', '75034', '75035', '75056',
  '75057', '75063', '75067', '75204', '75205', '75206', '75209', '75214', '75218', '75219',
  '75225', '75230', '75231', '75240', '75243', '75248', '75252', '75254', '75287',
]);

const today = new Date().toISOString().slice(0, 10);

const fileToBookingPhoto = (file: File): Promise<BookingPhotoPayload> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        name: file.name,
        type: file.type,
        data: base64,
      });
    };
    reader.onerror = () => reject(new Error('Could not read the selected photo.'));
    reader.readAsDataURL(file);
  })
);

const maxBookingPhotoSize = 4 * 1024 * 1024;

const ItemVisual = ({ kind }: { kind: ItemKind }) => {
  if (kind === 'pile') {
    return (
      <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
        <path d="M9 36h37l-5 10H14L9 36Z" className="fill-orange-500/25 stroke-orange-400" strokeWidth="2" />
        <path d="M17 34l7-14 8 14H17Z" className="fill-zinc-700 stroke-zinc-500" strokeWidth="2" />
        <path d="M28 34l8-18 9 18H28Z" className="fill-zinc-800 stroke-zinc-500" strokeWidth="2" />
        <path d="M12 36l7-10 6 10H12Z" className="fill-zinc-600 stroke-zinc-500" strokeWidth="2" />
      </svg>
    );
  }

  if (kind === 'couch') {
    return (
      <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
        <path d="M13 27h30a6 6 0 0 1 6 6v11H7V33a6 6 0 0 1 6-6Z" className="fill-zinc-800 stroke-orange-400" strokeWidth="2" />
        <path d="M16 18h24a5 5 0 0 1 5 5v10H11V23a5 5 0 0 1 5-5Z" className="fill-zinc-700 stroke-zinc-500" strokeWidth="2" />
        <path d="M13 44v5M43 44v5" className="stroke-orange-400" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'mattress') {
    return (
      <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
        <path d="M10 21h36v19H10z" className="fill-zinc-800 stroke-orange-400" strokeWidth="2" />
        <path d="M14 17h28v8H14z" className="fill-zinc-700 stroke-zinc-500" strokeWidth="2" />
        <path d="M15 31h26M15 36h18" className="stroke-zinc-500" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'fridge') {
    return (
      <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
        <path d="M17 8h22a4 4 0 0 1 4 4v36H13V12a4 4 0 0 1 4-4Z" className="fill-zinc-800 stroke-orange-400" strokeWidth="2" />
        <path d="M13 25h30M35 15v6M35 31v9" className="stroke-zinc-500" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'washer') {
    return (
      <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
        <path d="M14 9h28v38H14z" className="fill-zinc-800 stroke-orange-400" strokeWidth="2" />
        <circle cx="28" cy="31" r="10" className="fill-zinc-950 stroke-zinc-500" strokeWidth="2" />
        <path d="M20 17h6M33 17h4" className="stroke-zinc-500" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 56" className="h-12 w-12" aria-hidden="true">
      <path d="M10 15h36v25H10z" className="fill-zinc-800 stroke-orange-400" strokeWidth="2" />
      <path d="M22 46h12M28 40v6" className="stroke-zinc-500" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 21h24v13H16z" className="fill-zinc-950 stroke-zinc-600" strokeWidth="2" />
    </svg>
  );
};

const EnclosedTrailerFillMeter = ({ fill }: { fill: number }) => {
  const fillClipId = useId();
  const cargoWidth = 128;
  const fillWidth = Math.max(7, Math.min(cargoWidth, (cargoWidth * fill) / 100));

  return (
  <div className="mt-4">
    <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
      <span>12x8 Enclosed Trailer</span>
      <span className="text-orange-500">{fill}% Full</span>
    </div>
    <div className="rounded-none border border-zinc-800 bg-black/70 p-3">
      <svg viewBox="0 0 240 150" className="h-28 w-full" role="img" aria-label={`12 by 8 enclosed trailer ${fill}% full`}>
        <defs>
          <clipPath id={fillClipId}>
            <rect x="42" y="28" width={fillWidth} height="78" />
          </clipPath>
        </defs>
        <path d="M198 103h20l17 12" className="fill-none stroke-zinc-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 18h144l22 24v72H34V18Z" className="fill-zinc-950 stroke-zinc-500" strokeWidth="4" strokeLinejoin="round" />
        <g clipPath={`url(#${fillClipId})`}>
          <rect x="42" y="28" width={cargoWidth} height="78" className="fill-orange-500/80" />
          <path d="M44 98c8-13 18-17 29-11 10 6 18 6 26-4 10-12 22-12 32-1 10 11 20 9 32-5" className="fill-none stroke-orange-300/60" strokeWidth="4" strokeLinecap="round" />
        </g>
        <path d="M74 18v96M106 18v96M138 18v96M170 18v96" className="stroke-zinc-800" strokeWidth="2" />
        <path d="M34 18h144l22 24v72H34V18Z" className="fill-none stroke-orange-400" strokeWidth="2" strokeLinejoin="round" />
        <path d="M178 20v94" className="stroke-orange-400" strokeWidth="2" />
        <rect x="45" y="24" width="38" height="5" className="fill-zinc-700" />
        <path d="M34 116h164" className="stroke-zinc-700" strokeWidth="4" strokeLinecap="round" />
        <circle cx="126" cy="121" r="15" className="fill-zinc-950 stroke-zinc-500" strokeWidth="5" />
        <circle cx="126" cy="121" r="6" className="fill-orange-500" />
      </svg>
      <div className="mt-2 grid grid-cols-4 text-center text-[9px] font-black uppercase tracking-widest text-zinc-600">
        <span>1/8</span>
        <span>1/4</span>
        <span>1/2</span>
        <span>Full</span>
      </div>
    </div>
  </div>
  );
};

const VolumeBadge = ({ label }: { label: string }) => (
  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center border border-orange-500 bg-orange-500/10 text-center">
    <span className="text-xl font-black leading-none tracking-tighter text-orange-500">{label}</span>
    <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-zinc-500">Trailer</span>
  </div>
);

const ItemCard: React.FC<{
  item: Item;
  inCart: number;
  onAdd: (item: Item) => void;
  onRemove: (id: string) => void;
}> = ({
  item,
  inCart,
  onAdd,
  onRemove
}) => {
  return (
    <div className={`bg-zinc-900 border p-4 flex flex-col justify-between transition-colors group ${inCart ? 'border-orange-500 shadow-[0_0_0_1px_rgba(249,115,22,0.35)]' : 'border-zinc-800 hover:border-orange-500'}`}>
      <div className="mb-5 flex items-start gap-4">
        {item.volumeLabel ? (
          <VolumeBadge label={item.volumeLabel} />
        ) : (
          <div className={`shrink-0 border p-2 ${inCart ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-black/40 group-hover:border-orange-500'}`}>
            <ItemVisual kind={item.kind} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap justify-between items-start gap-x-3 gap-y-1">
            <h4 className="min-w-0 flex-1 basis-28 break-words text-base font-bold leading-tight text-zinc-100 transition-colors group-hover:text-orange-400 sm:text-lg">{item.name}</h4>
            <span className="shrink-0 text-xl font-black text-white group-hover:text-orange-400">${item.price}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.description}</p>
        </div>
      </div>

      {item.loadFill ? <EnclosedTrailerFillMeter fill={item.loadFill} /> : null}

      {inCart > 0 ? (
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 mt-5 p-1">
          <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Minus className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg w-8 text-center text-orange-500">{inCart}</span>
          <button type="button" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item)} className="p-2 text-orange-500 hover:text-orange-400 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onAdd(item)} className="w-full mt-5 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 text-white font-bold py-3 flex items-center justify-center gap-2 transition-colors uppercase tracking-wide text-xs group-hover:border-orange-500">
          <Plus className="w-4 h-4" /> Add to Haul
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [rush, setRush] = useState(false);
  const [heavy, setHeavy] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [serviceZip, setServiceZip] = useState('');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('idle');
  const [photoName, setPhotoName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [submittedBookingId, setSubmittedBookingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pickupWindows, setPickupWindows] = useState<AvailabilityWindow[]>(defaultPickupWindows);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>({
    customerName: '',
    phone: '',
    address: '',
    pickupDate: '',
    pickupWindow: '',
  });

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, all: boolean = false) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.quantity > 1 && !all) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const updateZip = (value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 5);
    setServiceZip(normalized);
    if (normalized.length < 5) {
      setServiceStatus('idle');
      return;
    }
    setServiceStatus(SERVICE_ZIPS.has(normalized) ? 'in' : 'out');
  };

  const scrollToBooking = () => {
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const rushFee = rush ? 75 : 0;
  const heavyFee = heavy ? 99 : 0;
  const total = subtotal + rushFee + heavyFee;

  const haulCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const checkoutLabel = serviceStatus === 'out' ? 'Request Custom Quote' : 'Confirm & Pay';

  const orderLines = useMemo(() => [
    ...cart.map(item => ({ id: item.id, name: `${item.name} x${item.quantity}`, amount: item.price * item.quantity })),
    ...(rush ? [{ id: 'rush', name: 'Same-Day Rush Pickup', amount: rushFee }] : []),
    ...(heavy ? [{ id: 'heavy', name: 'Heavy Lifting', amount: heavyFee }] : []),
  ], [cart, rush, heavy, rushFee, heavyFee]);

  const selectedPickupWindow = pickupWindows.find(window => window.id === checkoutForm.pickupWindow);

  useEffect(() => {
    if (!checkoutForm.pickupDate) {
      setPickupWindows(defaultPickupWindows);
      return;
    }

    let isActive = true;
    setIsCheckingAvailability(true);

    fetch(`/api/availability?date=${encodeURIComponent(checkoutForm.pickupDate)}`)
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'Could not check availability.');
        }
        return result;
      })
      .then(result => {
        if (!isActive) {
          return;
        }

        const windows = Array.isArray(result.windows) ? result.windows : defaultPickupWindows;
        setPickupWindows(windows);

        setCheckoutForm(prev => {
          const selectedWindow = windows.find((window: AvailabilityWindow) => window.id === prev.pickupWindow);
          return selectedWindow && !selectedWindow.available ? { ...prev, pickupWindow: '' } : prev;
        });
      })
      .catch(error => {
        if (!isActive) {
          return;
        }

        console.warn('Availability check failed. Falling back to open windows.', error);
        setPickupWindows(defaultPickupWindows);
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingAvailability(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [checkoutForm.pickupDate]);

  const openCheckout = () => {
    setBookingSubmitted(false);
    setFormError('');
    setModalOpen(true);
  };

  const updateCheckoutForm = (field: keyof CheckoutForm, value: string) => {
    setCheckoutForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormError('');
    if (file && file.size > maxBookingPhotoSize) {
      setPhotoFile(null);
      setPhotoName('');
      event.target.value = '';
      setFormError('Please choose a photo smaller than 4 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoName(file?.name || '');
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (selectedPickupWindow && !selectedPickupWindow.available) {
        throw new Error('That pickup window is no longer available. Please choose another window.');
      }

      const photo = photoFile ? await fileToBookingPhoto(photoFile) : null;
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: checkoutForm.customerName,
          phone: checkoutForm.phone,
          address: checkoutForm.address,
          zip: serviceZip,
          pickupDate: checkoutForm.pickupDate,
          pickupWindow: checkoutForm.pickupWindow,
          items: cart,
          addOns: [
            ...(rush ? [{ id: 'rush', name: 'Same-Day Rush Pickup', price: rushFee }] : []),
            ...(heavy ? [{ id: 'heavy', name: 'Heavy Lifting', price: heavyFee }] : []),
          ],
          subtotal,
          total,
          photo,
        }),
      });

      const responseText = await response.text();
      let result: { error?: string; bookingId?: string } = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { error: responseText };
      }

      if (!response.ok) {
        throw new Error(result.error || `Could not save this booking. Status: ${response.status}`);
      }

      setSubmittedBookingId(result.bookingId || '');
      setBookingSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save this booking.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500 selection:text-black pb-28 lg:pb-0 relative">

      <nav className="fixed top-0 left-0 right-0 z-30 bg-orange-600 px-6 py-2 border-b-2 border-black">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl tracking-tighter uppercase text-white flex items-center gap-2">
            <NinjaIcon className="w-8 h-8 text-white -ml-1" />
            JUNK NINJAS
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-white uppercase tracking-widest bg-black px-3 py-1">
            Service Status: <span className="text-green-400">Online / 24h Active</span>
          </div>
        </div>
      </nav>

      <header className="relative pt-28 pb-16 lg:pt-36 lg:pb-20 border-b border-zinc-800 px-4 bg-zinc-900 overflow-hidden">
        <img
          src="/assets/junk-ninjas-hero.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/20" />
        <div className="absolute inset-0 opacity-25">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_46%,rgba(255,255,255,0.06)_46%_48%,transparent_48%_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_420px] gap-10 items-center relative z-10">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-black border border-zinc-700 text-orange-500 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-8 shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 bg-orange-500"></span>
              </span>
              Servicing North Dallas & DFW
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-8 text-white">
              Make Your Junk <br className="hidden md:block" /> Disappear <span className="text-orange-500">In 24h</span>.
            </h1>

            <div className="max-w-2xl mx-auto lg:mx-0 mb-10">
              <p className="text-sm md:text-base text-zinc-400 border-l-2 border-orange-600 pl-4 italic mb-6 text-left inline-block">
                Select items, pay flat rate, leave on curb. No estimates. No contact.
              </p>
              <div className="bg-black/50 border border-zinc-700 p-4 text-left">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">The Ironclad Guarantee</p>
                <p className="text-xs md:text-sm font-medium leading-relaxed text-zinc-300">
                  If we miss your <span className="text-white underline decoration-orange-500">4-hour pickup window</span>, your haul is <span className="text-orange-500 font-bold">100% FREE</span>. No questions asked.
                </p>
              </div>
            </div>

            <button type="button" onClick={scrollToBooking} className="bg-orange-500 hover:bg-orange-400 focus:scale-95 transition-all text-black font-black uppercase tracking-widest text-lg md:text-xl px-10 py-5 flex items-center justify-center gap-3 mx-auto lg:mx-0 w-full sm:w-auto">
              Select Your Junk Below <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="hidden lg:block">
            <div className="border border-zinc-700 bg-black/70 p-4 shadow-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative min-h-64 overflow-hidden border border-zinc-800 bg-zinc-950">
                  <img
                    src="/assets/junk-before.png"
                    alt="Curbside pile before pickup"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                  <span className="absolute left-4 top-4 bg-red-500/10 border border-red-500/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-200 backdrop-blur-sm">Before</span>
                </div>
                <div className="relative min-h-64 overflow-hidden border border-orange-500/50 bg-zinc-950">
                  <img
                    src="/assets/junk-after.png"
                    alt="Clean curb and driveway after pickup"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                  <span className="absolute left-4 top-4 bg-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">After</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-2xl font-black text-orange-500">24h</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Pickup</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-2xl font-black text-orange-500">4hr</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Window</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-2xl font-black text-orange-500">$0</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">If Late</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto grid gap-px bg-zinc-900 sm:grid-cols-3">
          {TRUST_ITEMS.map(({ title, body, Icon }) => (
            <div key={title} className="bg-black px-5 py-5 flex gap-4">
              <Icon className="h-6 w-6 shrink-0 text-orange-500" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-zinc-950 px-4 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Fast Curbside Flow</p>
              <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tight text-white">How It Works</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
              Built for quick, no-contact junk removal: pick the haul size, reserve the window, and let the crew clear the curb.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="border border-zinc-800 bg-black p-5">
                <div className="mb-5 flex h-10 w-10 items-center justify-center border border-orange-500 bg-orange-500 text-lg font-black text-black">
                  {index + 1}
                </div>
                <h3 className="text-base font-black uppercase tracking-tight text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="booking" className="max-w-7xl mx-auto px-4 py-16 lg:py-24 flex flex-col lg:flex-row gap-8 lg:gap-12 relative">

        <div className="flex-1 space-y-16">
          <div className="border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Service Area Check</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Confirm Your ZIP</h2>
                <p className="mt-1 text-sm text-zinc-500">North Dallas and nearby DFW neighborhoods are live for online booking.</p>
              </div>
              <div className="sm:w-64">
                <label className="sr-only" htmlFor="service-zip">ZIP code</label>
                <input
                  id="service-zip"
                  inputMode="numeric"
                  value={serviceZip}
                  onChange={e => updateZip(e.target.value)}
                  className="w-full bg-black border border-zinc-700 px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="Enter ZIP"
                />
              </div>
            </div>
            {serviceStatus !== 'idle' ? (
              <div className={`mt-4 border px-4 py-3 text-sm font-bold ${serviceStatus === 'in' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-orange-500/40 bg-orange-500/10 text-orange-300'}`}>
                {serviceStatus === 'in' ? 'Good news: this ZIP is inside the standard booking zone.' : 'This ZIP may need a custom quote. You can still send the request.'}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-800 pb-4 gap-2">
              <h2 className="text-2xl lg:text-3xl font-black uppercase italic">1. Quick Pick Items</h2>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Per Piece Rates</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {QUICK_ITEMS.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  inCart={cart.find(i => i.id === item.id)?.quantity || 0}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-800 pb-4 gap-2">
              <h2 className="text-2xl lg:text-3xl font-black uppercase italic">2. Bulk Load Volumes</h2>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Space Based Pricing</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VOLUME_PILES.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  inCart={cart.find(i => i.id === item.id)?.quantity || 0}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-800 pb-4 gap-2">
              <h2 className="text-2xl lg:text-3xl font-black uppercase italic">3. Add-Ons</h2>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Optional Enhancements</span>
            </div>
            <div className="space-y-4 max-w-2xl">
              <label className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-800 border cursor-pointer hover:border-orange-500 transition-colors ${rush ? 'border-orange-500 bg-orange-600/10' : 'border-zinc-700'}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={rush} onChange={e => setRush(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                  <div className="flex-1">
                    <span className="font-bold text-sm text-white">Same-Day Rush Pickup</span>
                    <p className="text-zinc-500 text-xs hidden sm:block mt-0.5">We'll get it out of your way today.</p>
                  </div>
                </div>
                <span className="font-black text-orange-500 pl-8 sm:pl-0">+$75</span>
              </label>

              <label className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-800 border cursor-pointer hover:border-orange-500 transition-colors ${heavy ? 'border-orange-500 bg-orange-600/10' : 'border-zinc-700'}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={heavy} onChange={e => setHeavy(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                  <div className="flex-1">
                    <span className="font-bold text-sm text-white">Heavy Lifting {'>'} 200lbs</span>
                    <p className="text-zinc-500 text-xs hidden sm:block mt-0.5">Pianos, safes, extreme density.</p>
                  </div>
                </div>
                <span className="font-black text-orange-500 pl-8 sm:pl-0">+$99</span>
              </label>
            </div>
          </div>

          <div className="border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-black uppercase italic text-white">What We Do Not Take</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['Paint & chemicals', 'Fuel or oil tanks', 'Hazardous waste'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                  <X className="h-4 w-4 text-orange-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl lg:text-3xl font-black uppercase italic">FAQ</h2>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Before You Book</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {FAQS.map(item => (
                <details key={item.question} className="group border border-zinc-800 bg-zinc-900 p-5 open:border-orange-500/70">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-black uppercase tracking-wide text-white">
                    <span>{item.question}</span>
                    <Plus className="h-5 w-5 shrink-0 text-orange-500 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-500">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-[400px] shrink-0 hidden lg:block">
          <div className="sticky top-24 bg-zinc-900 border border-zinc-800 p-6 flex flex-col h-fit max-h-[calc(100vh-8rem)]">
            <h3 className="text-2xl font-black uppercase tracking-tight mb-6 text-white pb-6 border-b border-zinc-800">Your Haul</h3>

            <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4 minimalist-scrollbar">
              {!cart.length && !rush && !heavy ? (
                <div className="text-zinc-500 text-center py-12 flex flex-col items-center gap-3">
                  <Truck className="w-12 h-12 opacity-20" />
                  <p className="font-medium text-sm uppercase tracking-widest">No items selected.</p>
                </div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeFromCart(item.id, true)} className="text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div>
                          <p className="font-bold text-zinc-200 leading-tight text-sm tracking-wide">{item.name}</p>
                          <p className="text-zinc-500 text-xs">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-black text-white">${item.price * item.quantity}</span>
                    </div>
                  ))}
                  {rush && (
                    <div className="flex justify-between items-center pt-2">
                      <p className="font-bold text-orange-500 text-sm tracking-wide">Rush Pickup</p>
                      <span className="font-black text-orange-500">+$75</span>
                    </div>
                  )}
                  {heavy && (
                    <div className="flex justify-between items-center pt-2">
                      <p className="font-bold text-orange-500 text-sm tracking-wide">Heavy Lifting</p>
                      <span className="font-black text-orange-500">+$99</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-auto">
              <div className="border-t border-zinc-800 pt-6 space-y-3 mb-6">
                <div className="flex justify-between text-zinc-400 font-bold uppercase tracking-widest text-[10px]"><span>Subtotal</span> <span className="text-sm">${subtotal}</span></div>
                <div className="flex justify-between text-white font-black text-4xl pt-4 tracking-tighter">
                  <span className="text-xs text-orange-500 uppercase tracking-tighter self-end mb-1">Estimated Total</span>
                  <span className="text-orange-500">${total}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={total === 0}
                onClick={openCheckout}
                className="w-full bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-400 text-black font-black uppercase tracking-widest text-lg px-6 py-5 flex items-center justify-center transition-all bg-none"
              >
                Confirm & Book <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>

      </section>

      <div className={`fixed bottom-0 left-0 right-0 bg-zinc-900 border-t-2 border-zinc-800 px-4 py-4 z-40 lg:hidden flex justify-between items-center transition-transform duration-300 ease-in-out ${total > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">Estimated Total</p>
          <p className="font-black text-3xl text-orange-500 leading-none">${total}</p>
        </div>
        <button type="button" onClick={openCheckout} className="bg-orange-500 hover:bg-orange-400 text-black font-black uppercase px-6 py-3 tracking-widest text-sm flex items-center">
          Book <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12 bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border-4 w-full border-orange-600 max-w-5xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto flex flex-col relative minimalist-scrollbar">

            <div className="absolute top-6 right-6 z-20">
              <button type="button" onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                <X className="h-4 w-4" /> Close
              </button>
            </div>

            {bookingSubmitted ? (
              <div className="p-8 sm:p-12">
                <div className="max-w-2xl">
                  <CheckCircle2 className="h-12 w-12 text-orange-500 mb-6" />
                  <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white mb-4">Request Locked In</h2>
                  <p className="text-zinc-400 leading-relaxed">
                    Your haul details were saved. We will review the request, confirm the pickup window, and follow up by text.
                  </p>
                  {submittedBookingId ? (
                    <p className="mt-4 border border-zinc-800 bg-black px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Booking ID: <span className="text-orange-500">{submittedBookingId}</span>
                    </p>
                  ) : null}
                  <button type="button" onClick={() => setModalOpen(false)} className="mt-8 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase tracking-widest px-6 py-4">
                    Back to Booking
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_360px]">
                <div className="p-8 sm:p-10 space-y-8 flex-1">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white mb-2">Final Step: Logistics</h2>
                    <p className="text-zinc-400 text-sm font-medium">Lock in your 24-hour disappearance window.</p>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Contact Name</label>
                          <input
                            required
                            type="text"
                            value={checkoutForm.customerName}
                            onChange={e => updateCheckoutForm('customerName', e.target.value)}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                            placeholder="e.g. John Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Mobile Number (For Text Updates)</label>
                          <input
                            required
                            type="tel"
                            value={checkoutForm.phone}
                            onChange={e => updateCheckoutForm('phone', e.target.value)}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                            placeholder="(214) 555-0123"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Pickup Address</label>
                          <input
                            required
                            type="text"
                            value={checkoutForm.address}
                            onChange={e => updateCheckoutForm('address', e.target.value)}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                            placeholder="St. Address, City"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">ZIP Code</label>
                          <input
                            required
                            inputMode="numeric"
                            value={serviceZip}
                            onChange={e => updateZip(e.target.value)}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                            placeholder="75230"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Pickup Date</label>
                          <input
                            required
                            min={today}
                            type="date"
                            value={checkoutForm.pickupDate}
                            onChange={e => setCheckoutForm(prev => ({ ...prev, pickupDate: e.target.value, pickupWindow: '' }))}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 [color-scheme:dark] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">4-Hour Time Window</label>
                          <select
                            required
                            disabled={!checkoutForm.pickupDate || isCheckingAvailability}
                            value={checkoutForm.pickupWindow}
                            onChange={e => updateCheckoutForm('pickupWindow', e.target.value)}
                            className="w-full bg-black border border-zinc-700 px-3 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 outline-none"
                          >
                            <option value="">{isCheckingAvailability ? 'Checking availability...' : 'Select Window'}</option>
                            {pickupWindows.map(window => (
                              <option key={window.id} value={window.id} disabled={!window.available}>
                                {window.label}{window.available ? '' : ' - Booked'}
                              </option>
                            ))}
                          </select>
                          {checkoutForm.pickupDate ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Booked windows are disabled automatically.
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Optional Junk Photo</label>
                          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-zinc-700 bg-black px-4 py-5 text-center hover:border-orange-500">
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handlePhotoChange}
                            />
                            <Truck className="mb-2 h-7 w-7 text-orange-500" />
                            <span className="text-xs font-bold text-zinc-300">{photoName || 'Upload curbside photo'}</span>
                            <span className="mt-1 text-[10px] text-zinc-500">JPG, PNG, or phone camera image</span>
                          </label>
                        </div>
                        <div className="bg-orange-600/10 border border-orange-600/30 p-3 mt-4">
                          <p className="text-[10px] uppercase font-black text-orange-500">Pickup Instructions</p>
                          <p className="text-[10px] italic text-zinc-300 mt-1">Leave items on curb or driveway. Our crew will handle the rest. Zero contact required.</p>
                        </div>
                      </div>
                    </div>

                    {formError ? (
                      <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                        {formError}
                      </div>
                    ) : null}

                    <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 text-black font-black uppercase tracking-widest text-xl sm:text-2xl px-6 py-6 flex items-center justify-center transition-all mt-6">
                      {isSubmitting ? 'Saving Booking...' : checkoutLabel} <span className="ml-2">${total}</span>
                    </button>
                  </form>
                </div>

                <aside className="border-t lg:border-l lg:border-t-0 border-zinc-800 bg-black/50 p-8 sm:p-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Order Summary</p>
                  <h3 className="mt-2 text-2xl font-black uppercase text-white">Your Haul</h3>
                  <div className="mt-6 space-y-4">
                    {orderLines.map(line => (
                      <div key={line.id} className="flex justify-between gap-4 text-sm">
                        <span className="font-bold text-zinc-300">{line.name}</span>
                        <span className="font-black text-white">${line.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 border-t border-zinc-800 pt-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      <span>{haulCount} selected item{haulCount === 1 ? '' : 's'}</span>
                      <span>{serviceStatus === 'in' ? 'In Zone' : serviceStatus === 'out' ? 'Quote Zone' : 'ZIP Pending'}</span>
                    </div>
                    <div className="mt-4 flex justify-between text-4xl font-black tracking-tighter text-orange-500">
                      <span>Total</span>
                      <span>${total}</span>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-900 py-12 text-center text-zinc-600 font-medium">
        <p>&copy; {new Date().getFullYear()} Junk Ninjas Junk Removal Dallas. All rights reserved.</p>
      </footer>
    </div>
  );
}

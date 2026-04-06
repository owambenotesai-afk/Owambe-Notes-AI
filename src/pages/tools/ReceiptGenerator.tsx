import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, FileCode, Plus, Trash2, Loader2, Upload, Search, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
];

export const ReceiptGenerator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [businessName, setBusinessName] = useState('My Business');
  const [businessNameColor, setBusinessNameColor] = useState('#000000');
  const [businessAddress, setBusinessAddress] = useState('123 Main St, City, Country');
  const [logo, setLogo] = useState<string | null>(null);
  
  const [customerName, setCustomerName] = useState('John Doe');
  const [receiptNumber, setReceiptNumber] = useState(`REC-${Math.floor(Math.random() * 10000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', description: 'Consulting Services', quantity: 1, price: 150 }
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
  };

  const filteredCurrencies = CURRENCIES.filter(c => 
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) || 
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.symbol.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const generatePdf = () => {
    const doc = new jsPDF();
    const margin = 20;
    const rightAlign = doc.internal.pageSize.getWidth() - margin;
    
    let currentY = margin;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('RECEIPT', rightAlign, currentY + 10, { align: 'right' });
    
    if (logo) {
      try {
        doc.addImage(logo, margin, currentY, 30, 30);
        currentY += 35;
      } catch (e) {
        console.error('Failed to add logo to PDF', e);
        currentY += 10;
      }
    } else {
      currentY += 10;
    }
    
    // Business Info
    doc.setFontSize(12);
    doc.setTextColor(businessNameColor);
    doc.text(businessName, margin, currentY);
    doc.setTextColor(0, 0, 0); // Reset color
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(businessAddress, margin, currentY + 7);
    
    // Receipt Details
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt #: ${receiptNumber}`, rightAlign, currentY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${date}`, rightAlign, currentY + 7, { align: 'right' });
    
    currentY += 25;
    
    // Customer Info
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, margin, currentY + 7);
    
    currentY += 25;
    
    // Items Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY - 5, rightAlign - margin, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin + 2, currentY + 2);
    doc.text('Qty', rightAlign - 60, currentY + 2, { align: 'right' });
    doc.text('Price', rightAlign - 30, currentY + 2, { align: 'right' });
    doc.text('Total', rightAlign - 2, currentY + 2, { align: 'right' });
    
    // Items
    currentY += 15;
    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      doc.text(item.description, margin + 2, currentY);
      doc.text(item.quantity.toString(), rightAlign - 60, currentY, { align: 'right' });
      doc.text(`${currency.code} ${item.price.toFixed(2)}`, rightAlign - 30, currentY, { align: 'right' });
      doc.text(`${currency.code} ${(item.quantity * item.price).toFixed(2)}`, rightAlign - 2, currentY, { align: 'right' });
      currentY += 10;
    });
    
    // Total
    currentY += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(rightAlign - 70, currentY - 5, rightAlign, currentY - 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Total:', rightAlign - 30, currentY + 2, { align: 'right' });
    doc.text(`${currency.code} ${calculateTotal().toFixed(2)}`, rightAlign - 2, currentY + 2, { align: 'right' });

    return doc;
  };

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scale = 4;
    const width = 210 * scale;
    const height = 297 * scale;
    const margin = 20 * scale;
    const rightAlign = width - margin;

    canvas.width = width;
    canvas.height = height;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    let currentY = margin;

    // Helper functions
    const setFont = (weight: string, size: number) => {
      // jsPDF uses points for font size. 1 pt = 0.3527 mm.
      // Since our canvas scale maps 1 unit to 1 mm, we need to convert points to mm, then scale.
      const fontSize = size * 0.3527 * scale;
      ctx.font = `${weight} ${fontSize}px Helvetica, Arial, sans-serif`;
    };

    // Header
    setFont('bold', 24);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('RECEIPT', rightAlign, currentY + 10 * scale);

    if (logo) {
      try {
        const img = new Image();
        img.src = logo;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        ctx.drawImage(img, margin, currentY, 30 * scale, 30 * scale);
        currentY += 35 * scale;
      } catch (e) {
        console.error('Failed to add logo to Canvas', e);
        currentY += 10 * scale;
      }
    } else {
      currentY += 10 * scale;
    }

    // Business Info
    setFont('normal', 12);
    ctx.fillStyle = businessNameColor;
    ctx.textAlign = 'left';
    ctx.fillText(businessName, margin, currentY);
    
    ctx.fillStyle = '#000000';
    setFont('normal', 10);
    ctx.fillText(businessAddress, margin, currentY + 7 * scale);

    // Receipt Details
    setFont('bold', 10);
    ctx.textAlign = 'right';
    ctx.fillText(`Receipt #: ${receiptNumber}`, rightAlign, currentY);
    setFont('normal', 10);
    ctx.fillText(`Date: ${date}`, rightAlign, currentY + 7 * scale);

    currentY += 25 * scale;

    // Customer Info
    setFont('bold', 10);
    ctx.textAlign = 'left';
    ctx.fillText('Bill To:', margin, currentY);
    setFont('normal', 10);
    ctx.fillText(customerName, margin, currentY + 7 * scale);

    currentY += 25 * scale;

    // Items Table Header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(margin, currentY - 5 * scale, rightAlign - margin, 10 * scale);
    
    ctx.fillStyle = '#000000';
    setFont('bold', 10);
    ctx.textAlign = 'left';
    ctx.fillText('Description', margin + 2 * scale, currentY + 2 * scale);
    ctx.textAlign = 'right';
    ctx.fillText('Qty', rightAlign - 60 * scale, currentY + 2 * scale);
    ctx.fillText('Price', rightAlign - 30 * scale, currentY + 2 * scale);
    ctx.fillText('Total', rightAlign - 2 * scale, currentY + 2 * scale);

    // Items
    currentY += 15 * scale;
    setFont('normal', 10);
    items.forEach(item => {
      ctx.textAlign = 'left';
      ctx.fillText(item.description, margin + 2 * scale, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(item.quantity.toString(), rightAlign - 60 * scale, currentY);
      ctx.fillText(`${currency.code} ${item.price.toFixed(2)}`, rightAlign - 30 * scale, currentY);
      ctx.fillText(`${currency.code} ${(item.quantity * item.price).toFixed(2)}`, rightAlign - 2 * scale, currentY);
      currentY += 10 * scale;
    });

    // Total
    currentY += 10 * scale;
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(rightAlign - 70 * scale, currentY - 5 * scale);
    ctx.lineTo(rightAlign, currentY - 5 * scale);
    ctx.stroke();

    setFont('bold', 14);
    ctx.textAlign = 'right';
    ctx.fillText('Total:', rightAlign - 30 * scale, currentY + 2 * scale);
    ctx.fillText(`${currency.code} ${calculateTotal().toFixed(2)}`, rightAlign - 2 * scale, currentY + 2 * scale);

    return canvas;
  };

  const handleDownload = async (format: 'pdf' | 'jpg') => {
    setError('');
    if (items.length === 0) {
      setError('Please add at least one item.');
      return;
    }
    
    if (format === 'pdf') {
      const doc = generatePdf();
      doc.save(`Receipt_${receiptNumber}.pdf`);
    } else if (format === 'jpg') {
      const canvas = await generateCanvas();
      if (canvas) {
        const link = document.createElement('a');
        link.download = `Receipt_${receiptNumber}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      } else {
        setError('Failed to generate image.');
      }
    }
  };

  const handleSaveToVault = async () => {
    if (items.length === 0) {
      setError('Please add at least one item.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, `users/${user.uid}/notes`), {
        title: `Receipt ${receiptNumber}`,
        content: `Receipt for ${customerName} - Total: ${currency.symbol}${calculateTotal().toFixed(2)}`,
        type: 'receipt',
        data: {
          businessName,
          businessNameColor,
          businessAddress,
          logo,
          customerName,
          receiptNumber,
          date,
          currency,
          items,
          total: calculateTotal()
        },
        createdAt: now,
        updatedAt: now,
      });
      setSuccess('Receipt saved to your vault successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/notes`);
      setError('Failed to save receipt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-4xl mx-auto w-full">
        <button 
          onClick={() => navigate('/tools')}
          className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-stone-100 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Receipt Generator</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">Create professional business receipts instantly.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 border border-emerald-100">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-stone-900 p-5 md:p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-stone-100">Business Details</h2>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                  >
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-stone-500">({currency.symbol})</span>
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </button>
                  
                  {isCurrencyDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg z-10 overflow-hidden">
                      <div className="p-2 border-b border-stone-100 dark:border-stone-800">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Search currency..."
                            value={currencySearch}
                            onChange={(e) => setCurrencySearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-950 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {filteredCurrencies.length > 0 ? (
                          filteredCurrencies.map(c => (
                            <button
                              key={c.code}
                              onClick={() => {
                                setCurrency(c);
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch('');
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors text-left"
                            >
                              <span className="font-medium text-stone-900 dark:text-stone-100">{c.code} - {c.name}</span>
                              <span className="text-stone-500 dark:text-stone-400">{c.symbol}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-stone-500">No currencies found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="shrink-0 flex flex-col gap-2">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Company Logo</label>
                  <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center bg-stone-50 dark:bg-stone-950 overflow-hidden group">
                    {logo ? (
                      <>
                        <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={removeLogo} className="p-1.5 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
                        <Upload className="w-6 h-6 text-stone-400 mb-1" />
                        <span className="text-xs text-stone-500 font-medium">Upload</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 md:mb-2">Business Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        style={{ color: businessNameColor }}
                        className="flex-1 px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base font-medium"
                      />
                      <div className="relative shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 cursor-pointer">
                        <input
                          type="color"
                          value={businessNameColor}
                          onChange={(e) => setBusinessNameColor(e.target.value)}
                          className="absolute -inset-2 w-14 h-14 cursor-pointer"
                          title="Choose business name color"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 md:mb-2">Business Address</label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 p-5 md:p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 md:space-y-6">
              <h2 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-stone-100">Receipt Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 md:mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 md:mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 md:mb-2">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 p-5 md:p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-stone-100">Items</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="w-full sm:flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-20 sm:w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          className="w-full px-3 md:px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                        />
                      </div>
                      <div className="w-28 sm:w-32">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-medium">{currency.symbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="w-full pl-8 md:pl-9 pr-3 md:pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-sm md:text-base"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-stone-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#00BFA5] text-white p-6 rounded-3xl shadow-sm sticky top-6">
              <h3 className="text-base md:text-lg font-medium text-stone-100 mb-2">Total Amount</h3>
              <div className="text-3xl md:text-4xl font-bold mb-6">
                {currency.symbol}{calculateTotal().toFixed(2)}
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 py-3 px-4 rounded-xl font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownload('jpg')}
                    className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 py-3 px-4 rounded-xl font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ImageIcon className="w-4 h-4" />
                    JPG
                  </button>
                </div>
                <button
                  onClick={handleSaveToVault}
                  disabled={loading}
                  className="w-full bg-stone-800 dark:bg-stone-200 text-white py-3 px-6 rounded-xl font-medium hover:bg-stone-900 dark:hover:bg-stone-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save to Vault
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


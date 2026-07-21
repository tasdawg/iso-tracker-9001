import React, { useState } from 'react';
import { Material, User, InventoryLog } from '../types';
import { generateBatchCode, generateNextMaterialId, generateNextLogId } from '../utils';
import { Search, Plus, Trash2, ShieldAlert, Edit, X, RefreshCw, Layers, Paperclip, Check } from 'lucide-react';

interface MaterialsManagerProps {
  materials: Material[];
  currentUser: User;
  onUpdateMaterials: (updatedMaterials: Material[]) => void;
  logs?: InventoryLog[];
  onAddLog?: (log: InventoryLog) => void;
}

export default function MaterialsManager({
  materials,
  currentUser,
  onUpdateMaterials,
  logs = [],
  onAddLog
}: MaterialsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Material['type']>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form states (used for both adding and editing)
  const [name, setName] = useState('');
  const [type, setType] = useState<Material['type']>('RHS');
  const [dimensions, setDimensions] = useState('');
  const [grade, setGrade] = useState('Grade C350L0');
  const [totalStock, setTotalStock] = useState<number>(10);
  const [unit, setUnit] = useState('Lengths');
  const [supplier, setSupplier] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [materialCertUrl, setMaterialCertUrl] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // CSV Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1); // 1: Select/Drag, 2: Column Mapping, 3: Preview/Confirm

  // Field mappings (Target Material attribute -> CSV header name)
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    dimensions: '',
    grade: '',
    totalStock: '',
    unit: '',
    supplier: '',
    invoiceNo: '',
    price: '',
    batchNo: '',
    poNumber: ''
  });

  // Default fallback values if column is missing or unmapped
  const [defaults, setDefaults] = useState<Record<string, string>>({
    unit: 'Lengths',
    supplier: 'Action Aluminium',
    grade: 'Grade 6061 T6',
    dimensions: 'N/A',
    invoiceNo: 'CSV_IMPORT',
    poNumber: ''
  });

  // Helper: Guess profile type from description
  const guessProfileType = (pName: string): Material['type'] => {
    const norm = pName.toLowerCase();
    if (norm.includes('rhs') || norm.includes('rectangular hollow') || norm.includes('rectangular tube')) return 'RHS';
    if (norm.includes('shs') || norm.includes('square hollow') || norm.includes('square tube')) return 'SHS';
    if (norm.includes('chs') || norm.includes('circular') || norm.includes('tube') || norm.includes('pipe') || norm.includes('rot')) return 'CHS';
    if (norm.includes('plate') || norm.includes('sheet')) return 'Plate';
    if (norm.includes('beam') || norm.includes('column') || norm.includes('ub') || norm.includes('uc') || norm.includes('h-beam')) return 'H-Beam';
    if (norm.includes('flat bar') || norm.includes('flatbar')) return 'Flat Bar';
    return 'Other';
  };

  // Helper: Parse raw CSV text safely handling quotes, commas, and linebreaks
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"'; // Double quotes inside quote signifies escaped double quote
          i++;
        } else {
          inQuotes = !inQuotes; // Toggle quote block
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue.trim());
        if (row.length > 0 || currentValue !== '') {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (currentValue !== '' || row.length > 0) {
      row.push(currentValue.trim());
      lines.push(row);
    }
    return lines;
  };

  // Immediate Action Aluminium demonstration loader
  const loadActionAluminiumSample = () => {
    const sampleHeaders = ["Invoice", "Date", "Product Name", "Grade", "Dimensions", "Batch", "Qty", "Price", "Amount", "PO Code"];
    const sampleRows = [
      ["75213985", "2025-07-11", "Security Grille 6063 T6", "6063 T6", "7.0mm x 1250 x 2460", "ACT-75213985-A", "1.0", "285.00", "285.00", "PO-ACT-75213985"],
      ["75215687", "2025-07-25", "Angle 6060 T5", "6060 T5", "40.0 x 20.0 x 1.5 x 6.5 mtr", "ACT-75215687-B", "1.0", "35.10", "35.10", "PO-ACT-75215687"],
      ["75216620", "2025-08-01", "Sheet 5005 H34", "5005 H34", "6.0mm x 1200mm x 2400mm", "ACT-75216620-C", "1.0", "391.19", "391.19", "PO-ACT-75216620"],
      ["75218645", "2025-08-20", "Round Tube 6061 ROT4844", "6061", "24.4m", "ACT-75218645-D", "1.0", "478.73", "478.73", "PO-ACT-75218645"],
      ["75235610", "2026-01-14", "Machine Solid 2011", "2011", "solid 2011 x 3.6m", "ACT-75235610-E", "10.8", "107.20", "1157.76", "PO-ACT-75235610"],
      ["75239363", "2026-02-17", "Angle 6061 T6", "6061 T6", "38.1 x 38.1 x 4.75 x 5.5 mtr", "ACT-75239363-F1", "1.0", "1783.32", "1783.32", "PO-ACT-75239363"],
      ["75239363", "2026-02-17", "Flat Bar 6061 T6", "6061 T6", "50.0 x 100.0 x 2.5 mtr", "ACT-75239363-F2", "1.0", "337.64", "337.64", "PO-ACT-75239363"],
      ["75239363", "2026-02-17", "Round Tube 6060 T591 80mm", "6060 T591", "80.0 x 2.0 x 6.5 mtr", "ACT-75239363-F3", "1.0", "49.12", "49.12", "PO-ACT-75239363"],
      ["75242191", "2026-03-10", "Round Tube 6060 T591 ROT3216", "6060 T591", "32.0 X 1.6 3M LENGTHS", "ACT-75242191-G", "812.5", "4.81", "3908.13", "PO-ACT-75242191"],
      ["75243006", "2026-03-19", "Machine Solid 2011 T6 MS55", "2011 T6", "55MMX3.6M PER METRE", "ACT-75243006-H", "18.0", "113.23", "2038.14", "PO-ACT-75243006"],
      ["75251086", "2026-05-26", "Round Solid 6061 T6", "6061 T6", "50.8mm x 4.0 mtr", "ACT-75251086-I", "2.0", "82.05", "164.10", "PO-ACT-75251086"]
    ];

    setCsvRows(sampleRows);
    setCsvHeaders(sampleHeaders);

    setMapping({
      name: 'Product Name',
      dimensions: 'Dimensions',
      grade: 'Grade',
      totalStock: 'Qty',
      unit: '',
      supplier: '',
      invoiceNo: 'Invoice',
      price: 'Price',
      batchNo: 'Batch',
      poNumber: 'PO Code'
    });

    setDefaults({
      unit: 'Lengths',
      supplier: 'Action Aluminium',
      grade: '6061 T6',
      dimensions: 'N/A',
      invoiceNo: 'SAMPLE_ACT_INV',
      poNumber: 'SAMPLE-PO'
    });

    setImportStep(2);
  };

  // Parse custom uploaded files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvRawText(text);
      if (!text) {
        alert("The uploaded CSV file is empty.");
        return;
      }

      const parsedLines = parseCSV(text);
      if (parsedLines.length === 0) {
        alert("Could not extract rows from CSV.");
        return;
      }

      const headers = parsedLines[0].map(h => h.trim());
      setCsvHeaders(headers);

      const dataRows = parsedLines.slice(1).filter(r => r.some(cell => cell.trim().length > 0));
      setCsvRows(dataRows);

      // Guess heuristic column matches
      const autoMapping: Record<string, string> = {
        name: '',
        dimensions: '',
        grade: '',
        totalStock: '',
        unit: '',
        supplier: '',
        invoiceNo: '',
        price: '',
        batchNo: '',
        poNumber: ''
      };

      const lowerHeaders = headers.map(h => h.toLowerCase());
      const findBestHeader = (keys: string[]) => {
        const idx = lowerHeaders.findIndex(lh => keys.some(k => lh.includes(k)));
        return idx !== -1 ? headers[idx] : '';
      };

      autoMapping.name = findBestHeader(['product', 'desc', 'name', 'item', 'material']);
      autoMapping.dimensions = findBestHeader(['dim', 'size', 'width', 'length', 'thickness']);
      autoMapping.grade = findBestHeader(['grade', 'alloy', 'yield', 'strength']);
      autoMapping.totalStock = findBestHeader(['qty', 'quantity', 'stock', 'count', 'amount_unit']);
      autoMapping.price = findBestHeader(['price', 'cost', 'rate', 'each', 'price per', 'unit price']);
      autoMapping.batchNo = findBestHeader(['batch', 'heat', 'mill', 'trace', 'lot']);
      autoMapping.invoiceNo = findBestHeader(['invoice', 'inv', 'doc', 'recv_no']);
      autoMapping.supplier = findBestHeader(['supplier', 'vendor', 'mill_name']);
      autoMapping.poNumber = findBestHeader(['po', 'order', 'purchase']);

      setMapping(autoMapping);
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  // Convert mapped matrix rows and insert them
  const handleProcessImport = () => {
    const importedMaterials: Material[] = [];
    const logsToAdd: InventoryLog[] = [];
    const currentIdSeq = [...materials];

    csvRows.forEach((row, rowIndex) => {
      const getVal = (fieldKey: string): string => {
        const colHeader = mapping[fieldKey];
        if (!colHeader) return '';
        const colIdx = csvHeaders.indexOf(colHeader);
        if (colIdx === -1) return '';
        return row[colIdx] || '';
      };

      const rowName = getVal('name') || `Imported Mat Row ${rowIndex + 1}`;
      const rowDimensions = getVal('dimensions') || defaults.dimensions || 'N/A';
      const rowGrade = getVal('grade') || defaults.grade || 'Grade 6061 T6';
      const rowTotalStockStr = getVal('totalStock') || '1';
      const rowTotalStock = parseFloat(rowTotalStockStr) || 1;
      const rowUnit = getVal('unit') || defaults.unit || 'Lengths';
      const rowSupplier = getVal('supplier') || defaults.supplier || 'Action Aluminium';
      const rowPriceStr = getVal('price');
      const rowPrice = rowPriceStr ? parseFloat(rowPriceStr.replace(/[^0-9.]/g, '')) : undefined;
      const rowBatchNo = getVal('batchNo') || `ACT-BATCH-${Math.floor(100000 + Math.random() * 900000)}`;
      const rowInvoiceNo = getVal('invoiceNo') || defaults.invoiceNo || '';
      const rowPoNumber = getVal('poNumber') || defaults.poNumber || '';

      const rowType = guessProfileType(rowName);
      const newId = generateNextMaterialId(currentIdSeq);

      const newMat: Material = {
        id: newId,
        name: rowName,
        type: rowType,
        dimensions: rowDimensions,
        grade: rowGrade,
        totalStock: rowTotalStock,
        allocatedStock: 0,
        availableStock: rowTotalStock,
        unit: rowUnit,
        supplier: rowSupplier,
        batchNo: rowBatchNo.toUpperCase().trim(),
        invoiceNo: rowInvoiceNo,
        materialCertUrl: 'https://iso-certs.company-archive.net/certs/standard-mill-cert.pdf',
        poNumber: rowPoNumber,
        receivedByUserId: currentUser.id,
        receiptDate: new Date().toISOString().split('T')[0],
        price: rowPrice,
        quantityPurchased: rowTotalStock,
        isDeleted: false
      };

      importedMaterials.push(newMat);
      currentIdSeq.push(newMat); // chain IDs in sequential sequence generation

      logsToAdd.push({
        id: generateNextLogId(logs),
        type: 'INCOME',
        date: new Date().toISOString().split('T')[0],
        materialId: newId,
        materialName: rowName,
        quantity: rowTotalStock,
        batchNo: rowBatchNo.toUpperCase().trim(),
        userId: currentUser.id,
        invoiceNo: rowInvoiceNo,
        poNumber: rowPoNumber,
        notes: `Bulk registered via Smart CSV Column Mapping Importer.`
      });
    });

    onUpdateMaterials([...materials, ...importedMaterials]);
    if (onAddLog) {
      logsToAdd.forEach(log => onAddLog(log));
    }

    setShowImportModal(false);
    setCsvFile(null);
    setCsvRows([]);
    setCsvHeaders([]);
    setImportStep(1);
  };

  // active materials (filtering soft deleted elements)
  const activeMaterials = materials.filter(m => !m.isDeleted);

  const filteredMaterials = activeMaterials.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openAddForm = () => {
    setEditingMaterial(null);
    setName('');
    setType('RHS');
    setDimensions('');
    setGrade('Grade C350L0');
    setTotalStock(10);
    setUnit('Lengths');
    setSupplier('');
    setBatchNo(generateBatchCode('MILL-HEAT'));
    setInvoiceNo('');
    setMaterialCertUrl('');
    setPoNumber('');
    setShowAddForm(true);
  };

  const openEditForm = (mat: Material) => {
    setEditingMaterial(mat);
    setName(mat.name);
    setType(mat.type);
    setDimensions(mat.dimensions);
    setGrade(mat.grade);
    setTotalStock(mat.totalStock);
    setUnit(mat.unit);
    setSupplier(mat.supplier);
    setBatchNo(mat.batchNo);
    setInvoiceNo(mat.invoiceNo);
    setMaterialCertUrl(mat.materialCertUrl || '');
    setPoNumber(mat.poNumber || '');
    setShowAddForm(true);
  };

  const handleSoftDelete = (id: string, matName: string) => {
    const mat = materials.find(m => m.id === id);
    if (mat && mat.allocatedStock > 0) {
      alert(`ISO EXCEPTION CANNOT DELETE:\n\nMaterial "${matName}" has active physical allocations (${mat.allocatedStock} ${mat.unit}) reserved for active projects. You must cancel the projects or complete them to unblock decommissioning.`);
      return;
    }
    if (confirm(`SOFT-DELETE WARNING:\n\nDecommission material spec "${matName}"? This archives the specification sheet from active stock views but retains historical batch receipts.`)) {
      const updated = materials.map(m => m.id === id ? { ...m, isDeleted: true } : m);
      onUpdateMaterials(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dimensions || !grade || !supplier || !batchNo) {
      alert("Please complete the required details including Yield Strength Grade, Dimensions, Mill Supplier, and Heat Batch Trace Number.");
      return;
    }

    if (editingMaterial) {
      // Edit mode
      const updated = materials.map(m => m.id === editingMaterial.id ? {
        ...m,
        name,
        type,
        dimensions,
        grade,
        totalStock: Number(totalStock),
        availableStock: Number(totalStock) - m.allocatedStock,
        unit,
        supplier,
        batchNo: batchNo.toUpperCase().trim(),
        invoiceNo,
        materialCertUrl: materialCertUrl || 'https://iso-certs.company-archive.net/certs/standard-mill-cert.pdf',
        poNumber
      } : m);
      onUpdateMaterials(updated);

      if (onAddLog) {
        onAddLog({
          id: generateNextLogId(logs),
          type: 'SCRAP',
          date: new Date().toISOString().split('T')[0],
          materialId: editingMaterial.id,
          materialName: name,
          quantity: Math.abs(Number(totalStock) - editingMaterial.totalStock),
          batchNo: batchNo.toUpperCase().trim(),
          userId: currentUser.id,
          notes: `Batch configuration properties or physical stock level adjusted by supervisor (${currentUser.name})`
        });
      }
    } else {
      // Add mode
      const newId = generateNextMaterialId(materials);
      const newMat: Material = {
        id: newId,
        name,
        type,
        dimensions,
        grade,
        totalStock: Number(totalStock),
        allocatedStock: 0,
        availableStock: Number(totalStock),
        unit,
        supplier,
        batchNo: batchNo.toUpperCase().trim(),
        invoiceNo,
        materialCertUrl: materialCertUrl || 'https://iso-certs.company-archive.net/certs/standard-mill-cert.pdf',
        poNumber,
        receivedByUserId: currentUser.id,
        receiptDate: new Date().toISOString().split('T')[0],
        isDeleted: false
      };

      onUpdateMaterials([...materials, newMat]);

      if (onAddLog) {
        onAddLog({
          id: generateNextLogId(logs),
          type: 'INCOME',
          date: new Date().toISOString().split('T')[0],
          materialId: newId,
          materialName: name,
          quantity: Number(totalStock),
          batchNo: batchNo.toUpperCase().trim(),
          userId: currentUser.id,
          invoiceNo,
          poNumber,
          notes: `Supplier batch delivery successfully registered and cataloged by operator ${currentUser.name}`
        });
      }
    }

    setShowAddForm(false);
  };

  const getLogSymbol = (lType: string) => {
    switch (lType) {
      case 'INCOME': return <span className="text-green-500 font-extrabold">+ INC</span>;
      case 'ALLOCATION': return <span className="text-blue-500 font-bold">- ALLOC</span>;
      case 'DELIVERY_OUT': return <span className="text-orange-500 font-bold">» DELIV</span>;
      case 'SCRAP': return <span className="text-red-500">× ADJUST</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fadeIn">
      
      {/* Search and filters tab section */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-zinc-950 p-3 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          <div className="relative text-xs text-white w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-zinc-500" size={13} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search specs by Name, Grade, Supplier..."
              className="w-full bg-black border border-zinc-800 pl-8 pr-3 py-1.5 outline-none focus:border-orange-500 text-xs uppercase"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Profile Style:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-black border border-zinc-800 text-zinc-300 py-1 px-2.5 text-[10px] uppercase font-bold outline-none cursor-pointer focus:border-orange-500"
            >
              <option value="all">All Profiles</option>
              <option value="RHS">RHS (Rectangular Tube)</option>
              <option value="SHS">SHS (Square Tube)</option>
              <option value="CHS">CHS (Circular Tube)</option>
              <option value="Plate">Plate Sheet</option>
              <option value="H-Beam">Universal H-Beam</option>
              <option value="Flat Bar">Flat Bar</option>
              <option value="Other">Other Elements</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportStep(1);
            }}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-[#cbd5e1] py-2 px-4 text-xs font-bold tracking-widest uppercase cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Paperclip size={12} className="text-orange-500" /> Import CSV List
          </button>

          <button
            onClick={openAddForm}
            className="bg-orange-500 hover:bg-orange-400 text-black py-2 px-4 text-xs font-extrabold tracking-widest uppercase cursor-pointer whitespace-nowrap"
          >
            + Register Material Receipt
          </button>
        </div>
      </div>

      {/* Popout Registration Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl">
            <div className="absolute top-0 right-0 p-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-orange-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
              <span className="text-[9px] uppercase tracking-widest text-orange-500 font-bold block mb-1">
                ISO 9001 Clause 8.5.2 Receipt
              </span>
              <h3 className="font-bold text-base uppercase tracking-widest text-[#cbd5e1] font-sans">
                {editingMaterial ? 'Edit Material specifications' : 'Register material shipment batch receipt'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1 col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Product spec name / description <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RHS 100x50x4.0mm Hollow Section Tube"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Structural Profile Class <span className="text-orange-500">*</span>
                  </label>
                  <select
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                  >
                    <option value="RHS">RHS (Rectangular)</option>
                    <option value="SHS">SHS (Square)</option>
                    <option value="CHS">CHS (Circular)</option>
                    <option value="Plate">Plate Sheet</option>
                    <option value="H-Beam">H-Beam</option>
                    <option value="Flat Bar">Flat Bar</option>
                    <option value="Other">Other parts</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Standard Dimensions <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100x50x4mm x 6m"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={dimensions}
                    onChange={e => setDimensions(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Yield grade yield strength <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade C350L0"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Supplying Mill Corp <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BlueScope Distribution"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Mill Batch Heat code <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MILL-HEAT-2900"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none font-sans font-bold"
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Invoice Trace No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-929"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Stock count quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={totalStock}
                    onChange={e => setTotalStock(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Stock Unit
                  </label>
                  <input
                    type="text"
                    placeholder="Lengths / Sheets / kg"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Procurement PO No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-9901"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-zinc-500">
                    Mill Certification Document URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://company-drive.com/certs/MILL-HEAT-992.pdf"
                    className="w-full bg-black border border-zinc-800 p-2 text-xs focus:border-orange-500 outline-none text-zinc-400"
                    value={materialCertUrl}
                    onChange={e => setMaterialCertUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase tracking-wider text-[10px] border border-zinc-800"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-400 text-black font-extrabold px-6 py-2 uppercase tracking-wider text-[10px]"
                >
                  Confirm & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive CSV Importer Modal with Smart Column Mapping */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur bg-opacity-95 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 text-white relative shadow-2xl flex flex-col my-8">
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="text-zinc-500 hover:text-orange-500 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
              <span className="text-[9px] uppercase tracking-widest text-[#f97316] font-bold block mb-1">
                ISO 9001:2015 Traceability Core - Material Acquisition
              </span>
              <h3 className="font-sans font-extrabold text-lg uppercase tracking-wider">
                Smart CS-V Batch Importer & Column Mapper
              </h3>
              <p className="text-zinc-400 text-[11px] leading-relaxed mt-1">
                Load supplier statements, invoices, or stock spreadsheets. Map file columns into our secure heat batch register.
              </p>
            </div>

            {/* Steps breadcrumbs */}
            <div className="grid grid-cols-3 border-b border-zinc-900 text-center text-[10px] font-bold uppercase tracking-widest bg-black/40">
              <div className={`py-3 border-r border-zinc-900 ${importStep === 1 ? 'text-orange-500 bg-zinc-900' : 'text-zinc-500'}`}>
                1. Select / Drop CSV
              </div>
              <div className={`py-3 border-r border-zinc-900 ${importStep === 2 ? 'text-orange-500 bg-zinc-900' : 'text-zinc-500'}`}>
                2. Align Column Mapping
              </div>
              <div className={`py-3 ${importStep === 3 ? 'text-orange-500 bg-zinc-900' : 'text-zinc-500'}`}>
                3. Inspect & Commit
              </div>
            </div>

            <div className="p-6 max-h-[550px] overflow-y-auto text-xs">
              
              {/* STEP 1: UPLOAD / INGESTION */}
              {importStep === 1 && (
                <div className="space-y-6 py-4">
                  <div className="border-2 border-dashed border-zinc-800 hover:border-orange-500/80 p-8 h-48 flex flex-col justify-center items-center rounded-lg transition-all relative text-center bg-zinc-950/40">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Paperclip size={28} className="text-zinc-500 mb-2" />
                    <p className="font-bold text-zinc-300">Drag & Drop Supplier Statement CSV</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase">or click to browse local folders</p>
                  </div>

                  <div className="flex flex-col justify-center items-center gap-2 p-5 bg-[#09090b] border border-orange-500/20 text-center">
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest block font-sans">Immediate Demonstration</span>
                    <h4 className="text-[11px] text-white">No local CSV ready? Pull supplier entries immediately using Action Aluminium invoice records.</h4>
                    <button
                      type="button"
                      onClick={loadActionAluminiumSample}
                      className="mt-2 bg-orange-600 hover:bg-orange-500 transition-all font-black text-black px-5 py-2.5 uppercase tracking-widest text-[9px] cursor-pointer"
                    >
                      ⚡ Load Action Aluminium Invoice Statement (.csv)
                    </button>
                    <p className="text-[9px] text-zinc-500 italic mt-0.5">Contains 11 raw aluminium plates, sheets, solids, and profile tubes with real invoices match.</p>
                  </div>
                </div>
              )}

              {/* STEP 2: COLUMN ALIGNMENT */}
              {importStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-orange-950/20 border border-orange-500/10 p-3 text-zinc-300 rounded leading-normal flex flex-col gap-1 text-[11px]">
                    <span className="font-bold text-orange-400 text-[10px] uppercase">Mapping Instructions:</span>
                    Select which column from your CSV file corresponds to each required inventory data spec. Standard defaults will automatically populate unmapped or missing values.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 bg-black/60 p-4 border border-zinc-900">
                      <h4 className="text-[10px] uppercase tracking-widest text-[#f97316] font-bold pb-1.5 border-b border-zinc-900">Required Target Fields</h4>

                      {/* Product Name Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Material Description:</label>
                        <select
                          value={mapping.name}
                          onChange={e => setMapping({ ...mapping, name: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Choose CSV Column (Required) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Dimensions Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Dimensions spec:</label>
                        <select
                          value={mapping.dimensions}
                          onChange={e => setMapping({ ...mapping, dimensions: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Choose Column (Or use generic default) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Yield Grade Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Yield Grade:</label>
                        <select
                          value={mapping.grade}
                          onChange={e => setMapping({ ...mapping, grade: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Choose Column (Or use generic default) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Total Stock / Qty Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Invoice count qty:</label>
                        <select
                          value={mapping.totalStock}
                          onChange={e => setMapping({ ...mapping, totalStock: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Choose CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 bg-black/60 p-4 border border-zinc-900">
                      <h4 className="text-[10px] uppercase tracking-widest text-[#f97316] font-bold pb-1.5 border-b border-zinc-900">Traceability & Value Fields</h4>

                      {/* Supplier invoice Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Invoice Tracing #:</label>
                        <select
                          value={mapping.invoiceNo}
                          onChange={e => setMapping({ ...mapping, invoiceNo: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Not Mapped (Or constant default) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Mill Batch Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Heat Batch Trace Code:</label>
                        <select
                          value={mapping.batchNo}
                          onChange={e => setMapping({ ...mapping, batchNo: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Select Column (Auto gen if skipped) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Rate / price Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">Unit Invoice Cost:</label>
                        <select
                          value={mapping.price}
                          onChange={e => setMapping({ ...mapping, price: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Not Mapped --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* PO code Mapping */}
                      <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">PO Code:</label>
                        <select
                          value={mapping.poNumber}
                          onChange={e => setMapping({ ...mapping, poNumber: e.target.value })}
                          className="col-span-2 bg-black border border-zinc-800 p-2 text-xs outline-none text-[#cbd5e1]"
                        >
                          <option value="">-- Not Mapped --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Fallbacks */}
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                    <h4 className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider mb-2 font-mono">Constant Fallback Defaults (Used if column skipped or empty)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-zinc-500 mb-1">Supplier Fallback</label>
                        <input
                          type="text"
                          value={defaults.supplier}
                          onChange={e => setDefaults({ ...defaults, supplier: e.target.value })}
                          className="w-full bg-black border border-zinc-800 p-1.5 text-[10.5px] outline-none h-8 text-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-zinc-500 mb-1">Standard Grade Fallback</label>
                        <input
                          type="text"
                          value={defaults.grade}
                          onChange={e => setDefaults({ ...defaults, grade: e.target.value })}
                          className="w-full bg-black border border-zinc-800 p-1.5 text-[10.5px] outline-none h-8 text-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-zinc-500 mb-1">Standard Units Fallback</label>
                        <input
                          type="text"
                          value={defaults.unit}
                          onChange={e => setDefaults({ ...defaults, unit: e.target.value })}
                          className="w-full bg-black border border-zinc-800 p-1.5 text-[10.5px] outline-none h-8 text-[#cbd5e1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-zinc-500 mb-1">Invoice Fallback Code</label>
                        <input
                          type="text"
                          value={defaults.invoiceNo}
                          onChange={e => setDefaults({ ...defaults, invoiceNo: e.target.value })}
                          className="w-full bg-black border border-zinc-800 p-1.5 text-[10.5px] outline-none h-8 text-[#cbd5e1]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setImportStep(1)}
                      className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase text-[10px] border border-zinc-800"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!mapping.name) {
                          alert("A Mapping for Description / Product Name is mandatory to parse raw items.");
                          return;
                        }
                        setImportStep(3);
                      }}
                      className="bg-orange-500 hover:bg-orange-400 font-extrabold text-[#000] px-5 py-2 uppercase text-[10px]"
                    >
                      Analyze & Map Preview »
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW AND COMMIT */}
              {importStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-900 border border-zinc-800 flex justify-between items-center text-[11px]">
                    <span className="font-bold text-zinc-300 uppercase">Analysis Outcome:</span>
                    <span className="bg-orange-500/10 text-orange-400 font-bold px-2 py-0.5 border border-orange-500/10">
                      {csvRows.length} Mapped materials specs recognized
                    </span>
                  </div>

                  <div className="border border-zinc-900 overflow-x-auto">
                    <table className="w-full text-left text-[10.5px] border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-800 uppercase tracking-wider text-[8.5px] text-zinc-500">
                          <th className="p-3">Matched Description Description</th>
                          <th className="p-3">Mapped Grade</th>
                          <th className="p-3">Profile Class</th>
                          <th className="p-3">Supplier Trace</th>
                          <th className="p-3">Stock count</th>
                          <th className="p-3">Track Heat Code</th>
                          <th className="p-3 text-right">Unit Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 font-mono">
                        {csvRows.map((row, idx) => {
                          const getVal = (fieldKey: string): string => {
                            const colHeader = mapping[fieldKey];
                            if (!colHeader) return '';
                            const colIdx = csvHeaders.indexOf(colHeader);
                            if (colIdx === -1) return '';
                            return row[colIdx] || '';
                          };

                          const rowName = getVal('name') || `Imported Row ${idx+1}`;
                          const rowGrade = getVal('grade') || defaults.grade || 'Grade 6061 T6';
                          const rowDimensions = getVal('dimensions') || defaults.dimensions || 'N/A';
                          const rowTotalStock = getVal('totalStock') || '1';
                          const rowUnits = getVal('unit') || defaults.unit || 'Lengths';
                          const rowSupplier = getVal('supplier') || defaults.supplier || 'Action Aluminium';
                          const rowBatch = getVal('batchNo') || 'TBD (Auto Generated)';
                          const rowPriceStr = getVal('price');
                          const rowPrice = rowPriceStr ? parseFloat(rowPriceStr.replace(/[^0-9.]/g, '')) : undefined;

                          return (
                            <tr key={idx} className="hover:bg-zinc-900/30 text-zinc-300">
                              <td className="p-3">
                                <span className="font-sans font-bold text-white block capitalize">{rowName}</span>
                                <span className="text-[9px] text-zinc-500 block uppercase">Dims: {rowDimensions}</span>
                              </td>
                              <td className="p-3 text-orange-400 font-bold uppercase">{rowGrade}</td>
                              <td className="p-3 text-zinc-400 capitalize">{guessProfileType(rowName)}</td>
                              <td className="p-3">
                                <span className="text-zinc-200 block truncate max-w-[100px] font-sans">{rowSupplier}</span>
                                <span className="text-[8px] text-zinc-500 block">Inv: #{getVal('invoiceNo') || defaults.invoiceNo}</span>
                              </td>
                              <td className="p-3 text-zinc-200 font-bold">{rowTotalStock} {rowUnits}</td>
                              <td className="p-3 text-[9px]">
                                <span className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 text-zinc-400">
                                  {rowBatch}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-green-400">
                                {rowPrice !== undefined ? `$${rowPrice.toFixed(2)}` : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setImportStep(2)}
                      className="bg-black hover:bg-zinc-900 text-zinc-400 px-4 py-2 uppercase text-[10px] border border-zinc-800"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessImport}
                      className="bg-orange-500 hover:bg-orange-400 font-extrabold text-[#000] px-6 py-2 uppercase tracking-wide text-[10px]"
                    >
                      ⚡ Ingest Batch & Commit to Ledger ({csvRows.length} Items)
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table of active materials specs (Left 2 cols) */}
        <div className="lg:col-span-2 overflow-x-auto bg-black border border-zinc-800">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-[9px] bg-zinc-950">
                <th className="py-2.5 px-3 font-bold text-zinc-500">Spec ID</th>
                <th className="py-2.5 px-2">Steel profile specifications</th>
                <th className="py-2.5 px-2">Yield grade</th>
                <th className="py-2.5 px-2">Mill Supplier</th>
                <th className="py-2.5 px-2">Pretrace Heat Batch Code</th>
                <th className="py-2.5 px-2 text-center">Remaining Stock</th>
                <th className="py-2.5 px-3 text-right">Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(mat => {
                const isShortage = mat.availableStock <= 3;
                return (
                  <tr key={mat.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-all text-zinc-300">
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-zinc-500">
                        {mat.id}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-0.5">
                        <span className="text-[12px] font-sans font-extrabold text-white block uppercase">
                          {mat.name}
                        </span>
                        <span className="text-[9px] text-zinc-500 block uppercase">
                          DIMENSIONS: {mat.dimensions} | {mat.type} shape
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-[10px] font-bold text-orange-500 uppercase">
                      {mat.grade}
                    </td>
                    <td className="py-3 px-2 text-zinc-400 text-[10px] uppercase truncate max-w-[120px]">
                      {mat.supplier}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">
                        {mat.batchNo}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="space-y-0.5">
                        <span className={`text-[12px] font-extrabold font-mono ${isShortage ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                          {mat.availableStock} / {mat.totalStock} {mat.unit}
                        </span>
                        <span className="block text-[9px] text-zinc-500 uppercase">
                          {mat.allocatedStock} reserved
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1 px-1">
                        <button
                          onClick={() => openEditForm(mat)}
                          className="p-1 bg-zinc-950 hover:bg-orange-500 text-zinc-400 hover:text-black border border-zinc-800 hover:border-orange-500 transition-all cursor-pointer"
                        >
                          <Edit size={10} />
                        </button>
                        <button
                          onClick={() => handleSoftDelete(mat.id, mat.name)}
                          className="p-1 bg-zinc-950 hover:bg-red-950 hover:text-red-400 text-zinc-500 border border-zinc-800 transition-all cursor-pointer"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-sans text-xs">
                    NO RAW METAL PRODUCTS MATCHING CORRESPONDING SELECTIONS
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic transaction logs stream (Right 1 col) */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-2 border-b border-zinc-800 mb-3 flex items-center justify-between">
              <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-orange-500 flex items-center gap-1.5">
                <ShieldAlert size={12} /> Live Trace-ability Logs (ISO 8.5.2)
              </h4>
              <span className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                {logs.length} Operations
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {logs.slice(0, 15).map((log, idx) => (
                <div key={idx} className="p-2.5 bg-black border border-zinc-900 space-y-1.5 hover:border-zinc-800 transition-all">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    {getLogSymbol(log.type)}
                    <span className="text-zinc-600 font-bold">{log.date}</span>
                  </div>

                  <p className="text-[11px] font-bold text-zinc-200 line-clamp-1 uppercase">
                    {log.materialName}
                  </p>

                  <p className="text-[10px] text-zinc-400 leading-normal font-sans italic">
                    {log.notes || 'No custom trace observations logged.'}
                  </p>

                  <div className="pt-1.5 border-t border-zinc-900 flex justify-between items-center text-[8px] uppercase text-zinc-500 font-mono">
                    <span>Batch No: <strong className="text-zinc-400">{log.batchNo}</strong></span>
                    <span>Operator ID: <strong className="text-zinc-400">{log.userId}</strong></span>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <p className="text-center py-10 text-zinc-600 text-[10px] uppercase">
                  Weld ledger has not processed any physical material receipts.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-black border border-zinc-900 text-[9px] leading-relaxed text-zinc-500 uppercase">
            Continuous audit of heat receipts is an ISO 9001 registration dependency. Any stock adjustments generate non-repudiable audit marks detailing operator IDs.
          </div>
        </div>

      </div>

    </div>
  );
}

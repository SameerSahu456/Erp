// User-facing copy for the vendors sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const VENDORS_STRINGS = {
  // List page chrome.
  list: {
    title: "Vendor Management",
    subtitle: "Registered vendors, onboarding pipeline, and suspension flags.",
    breadcrumb: "Vendors",
    registerVendor: "Register Vendor",
    stats: {
      totalVendors: "Total Vendors",
      active: "Active",
      pendingApproval: "Pending Approval",
      suspended: "Suspended",
    },
    tabs: {
      active: "Active",
      pending: "Pending",
      all: "All",
    },
    columns: {
      code: "Code",
      companyName: "Company Name",
      type: "Type",
      categories: "Categories",
      contact: "Contact",
      city: "City",
      status: "Status",
      rating: "Rating",
      created: "Created",
    },
    empty: {
      title: "No vendors yet",
      description: "Register a vendor to start sourcing parts and tracking spend.",
      action: "Register Vendor",
    },
  },

  // Detail page — entity header actions.
  detail: {
    notFoundTitle: "Vendor not found",
    notFoundDescription: "The vendor you are looking for does not exist or has been removed.",
    backToVendors: "Back to Vendors",
    edit: "Edit",
    approve: "Approve",
    suspend: "Suspend",
    reject: "Reject",

    tabs: {
      overview: "Overview",
      taxBank: "Tax & Bank",
      documents: "Documents",
      categories: "Categories",
      performance: "Performance",
      comments: "Comments",
    },

    // Overview tab — Company Information card.
    companyInfo: {
      cardTitle: "Company Information",
      type: "Type",
      industry: "Industry",
      website: "Website",
      primaryContact: "Primary Contact",
      email: "Email",
      phone: "Phone",
    },

    // Overview tab — Secondary Contact card.
    secondaryContact: {
      cardTitle: "Secondary Contact",
      name: "Name",
      email: "Email",
      phone: "Phone",
    },

    // Overview tab — Address card.
    address: {
      cardTitle: "Address",
    },

    // Tax & Bank tab.
    taxInfo: {
      cardTitle: "Tax Information",
      gstNumber: "GST Number",
      pan: "PAN",
      msmeRegistration: "MSME Registration",
      tradeLicense: "Trade License",
    },
    bankDetails: {
      cardTitle: "Bank Details",
      accountName: "Account Name",
      accountNumber: "Account Number",
      ifscCode: "IFSC Code",
      bankName: "Bank Name",
      branch: "Branch",
    },
    paymentTerms: {
      cardTitle: "Payment Terms",
      paymentTerms: "Payment Terms",
      creditLimit: "Credit Limit",
      notApplicable: "N/A",
    },

    // Documents tab.
    documents: {
      verifiedCount: (verified: number, total: number) => `${verified}/${total} documents verified`,
      uploadDocument: "Upload Document",
      uploadDialogTitle: "Upload Document",
      uploadDialogDescription: "Upload vendor documents for verification.",
      cancel: "Cancel",
      upload: "Upload",
      columns: {
        documentType: "Document Type",
        fileName: "File Name",
        status: "Status",
        uploaded: "Uploaded",
        expiry: "Expiry",
      },
    },

    // Categories tab.
    categories: {
      cardTitle: "Product Categories",
      availableParts: {
        cardTitle: "Available Parts",
        description: "View parts available from this vendor in the",
        imsLink: "IMS Categories",
        moduleSuffix: "module.",
      },
    },

    // Performance tab.
    performance: {
      stats: {
        rating: "Rating",
        onTimeDelivery: "On-Time Delivery",
        qualityScore: "Quality Score",
        totalOrders: "Total Orders",
      },
      totalSpend: "Total Spend",
      orderHistory: {
        cardTitle: "Order History",
        description: "View order history in the",
        procurementLink: "Procurement",
        moduleSuffix: "module.",
      },
    },

    // Right sidebar cards.
    sidebar: {
      status: {
        cardTitle: "Status",
      },
      quickInfo: {
        cardTitle: "Quick Info",
        contact: "Contact",
        city: "City",
        paymentTerms: "Payment Terms",
        rating: "Rating",
      },
      approval: {
        cardTitle: "Approval",
        approvedBy: "Approved By",
        date: "Date",
      },
      notes: {
        cardTitle: "Notes",
      },
    },

    // Approve dialog.
    approveDialog: {
      title: "Approve Vendor",
      description: (companyName: string) => `Approve "${companyName}" as a registered vendor?`,
      cancel: "Cancel",
      approve: "Approve",
    },

    // Suspend dialog.
    suspendDialog: {
      title: "Suspend Vendor",
      description: (companyName: string) => `Are you sure you want to suspend "${companyName}"?`,
      cancel: "Cancel",
      suspend: "Suspend",
    },

    // Reject dialog.
    rejectDialog: {
      title: "Reject Vendor",
      description: "Provide a reason for rejecting this vendor registration.",
      placeholder: "Rejection reason...",
      cancel: "Cancel",
      reject: "Reject",
    },
  },

  // Star icon character used in rating display (non-translatable glyph kept out
  // of JSX so the no-literal-string rule is satisfied).
  starIcon: "★",

  // Multi-step vendor registration / edit form.
  form: {
    titles: {
      edit: "Edit Vendor",
      register: "Register Vendor",
    },
    subtitles: {
      editing: (companyName: string) => `Editing ${companyName}`,
      register: "Complete all steps to register a new vendor.",
    },
    breadcrumbs: {
      vendors: "Vendors",
      new: "New",
      edit: "Edit",
    },
    footer: {
      stepProgress: (current: number, total: number, label: string) =>
        `Step ${current} of ${total} — ${label}`,
      cancel: "Cancel",
      previous: "Previous",
      next: "Next",
      submit: "Submit",
    },

    // Step 0 — Company Details.
    company: {
      cardTitle: "Company Details",
      companyName: "Company Name",
      companyNamePlaceholder: "Enter company name",
      companyType: "Company Type",
      companyTypePlaceholder: "Select type",
      industry: "Industry",
      industryPlaceholder: "e.g. IT Hardware",
      website: "Website",
      websitePlaceholder: "https://",
      notes: "Notes",
      notesPlaceholder: "Additional notes...",
    },

    // Step 1 — Contact Information.
    contact: {
      cardTitle: "Contact Information",
      primaryContact: "Primary Contact",
      secondaryContact: "Secondary Contact (Optional)",
      name: "Name",
      namePlaceholder: "Full name",
      email: "Email",
      emailPlaceholder: "email@example.com",
      phone: "Phone",
      phonePlaceholder: "+91 XXXXX XXXXX",
    },

    // Step 2 — Address.
    address: {
      cardTitle: "Address",
      address: "Address",
      addressPlaceholder: "Street address",
      city: "City",
      cityPlaceholder: "City",
      state: "State",
      statePlaceholder: "State",
      pincode: "Pincode",
      pincodePlaceholder: "PIN Code",
      country: "Country",
      countryPlaceholder: "Country",
    },

    // Step 3 — Tax & Legal.
    tax: {
      cardTitle: "Tax & Legal",
      gstNumber: "GST Number",
      gstPlaceholder: "e.g. 29AABCD1234E1Z5",
      panNumber: "PAN Number",
      panPlaceholder: "e.g. AABCD1234E",
      msmeRegistration: "MSME Registration",
      msmePlaceholder: "UDYAM number (optional)",
      tradeLicense: "Trade License",
      tradeLicensePlaceholder: "Trade license number (optional)",
    },

    // Step 4 — Bank Details.
    bank: {
      cardTitle: "Bank Details",
      accountName: "Account Name",
      accountNamePlaceholder: "Account holder name",
      accountNumber: "Account Number",
      accountNumberPlaceholder: "Account number",
      ifscCode: "IFSC Code",
      ifscPlaceholder: "e.g. HDFC0001234",
      bankName: "Bank Name",
      bankNamePlaceholder: "Bank name",
      branch: "Branch",
      branchPlaceholder: "Branch name",
    },

    // Step 5 — Payment Terms.
    terms: {
      cardTitle: "Payment Terms",
      paymentTerms: "Payment Terms",
      paymentTermsPlaceholder: "Select terms",
      creditLimit: "Credit Limit (₹)",
      creditLimitPlaceholder: "e.g. 5000000",
    },

    // Step 6 — Product Categories.
    categories: {
      cardTitle: "Product Categories",
      description: "Select the product categories this vendor supplies. Type to add custom categories.",
      addCategoryPlaceholder: "Add category...",
      quickAddLabel: "Quick add from IMS categories:",
    },

    // Step 7 — Documents.
    documents: {
      cardTitle: "Documents",
      description:
        "Upload required documents: GST Certificate, PAN Card, MSME Certificate, Cancelled Cheque, Bank Statement, etc.",
    },

    // Step 8 — Review & Submit.
    review: {
      cardTitle: "Review & Submit",
      sections: {
        companyDetails: "Company Details",
        contactInformation: "Contact Information",
        address: "Address",
        taxLegal: "Tax & Legal",
        bankDetails: "Bank Details",
        terms: "Terms",
        productCategories: "Product Categories",
        documents: "Documents",
      },
      fields: {
        companyName: "Company Name",
        type: "Type",
        industry: "Industry",
        website: "Website",
        primaryContact: "Primary Contact",
        email: "Email",
        phone: "Phone",
        secondaryContact: "Secondary Contact",
        gstNumber: "GST Number",
        pan: "PAN",
        msme: "MSME",
        tradeLicense: "Trade License",
        accountName: "Account Name",
        accountNumber: "Account Number",
        ifsc: "IFSC",
        bank: "Bank",
        paymentTerms: "Payment Terms",
        creditLimit: "Credit Limit",
      },
      noCategoriesSelected: "No categories selected",
      noDocumentsUploaded: "No documents uploaded",
      filesReadyToUpload: (count: number) => `${count} file(s) ready to upload`,
      existingDocuments: (count: number) => `${count} existing document(s)`,
    },
  },
} as const

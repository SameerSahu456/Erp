// User-facing copy for the customers sub-feature.
//
// Coding-guideline §16.12 (bucket 1 — screen/component copy): titles, button
// labels, placeholders, empty/error/loading text, dialog copy, and the
// sub-feature's toast messages live here as one typed `as const` object instead
// of being hardcoded ("naked") in JSX/hooks. Components and hooks import this
// single source so copy stays consistent and is edited in one place.
//
// Dynamic copy is expressed as a function member.
export const CUSTOMERS_STRINGS = {
  breadcrumbs: {
    customers: "Customers",
    new: "New",
    edit: "Edit",
  },

  list: {
    title: "Customer Management",
    subtitle: "Registered customers, onboarding status, and outstanding balances.",
    registerCustomer: "Register Customer",
    columns: {
      code: "Code",
      companyName: "Company Name",
      type: "Type",
      industry: "Industry",
      accountManager: "Account Manager",
      outstanding: "Outstanding",
      status: "Status",
      city: "City",
    },
    stats: {
      totalCustomers: "Total Customers",
      active: "Active",
      onboarding: "Onboarding",
      overdueBalance: "Overdue Balance",
    },
    tabs: {
      active: "Active",
      onboarding: "Onboarding",
      all: "All",
    },
    empty: {
      title: "No customers yet",
      description: "Register a customer to start onboarding and tracking billing.",
      action: "Register Customer",
    },
  },

  detail: {
    notFound: "Customer not found",
    notFoundDescription: "The customer you are looking for does not exist or has been removed.",
    backToCustomers: "Back to Customers",
    edit: "Edit",

    tabs: {
      overview: "Overview",
      contacts: "Contacts",
      addresses: "Addresses",
      documentsKyc: "Documents & KYC",
      financials: "Financials",
      rentals: "Rentals",
      comments: "Comments",
    },

    overview: {
      companyInformation: "Company Information",
      billingAddress: "Billing Address",
      accountManager: "Account Manager",
      infoLabels: {
        type: "Type",
        industry: "Industry",
        website: "Website",
        pricingTier: "Pricing Tier",
        name: "Name",
        email: "Email",
        gst: "GST",
        pan: "PAN",
      },
    },

    contacts: {
      addContact: "Add Contact",
      contactsCount: (count: number) => `${count} contact(s)`,
      primary: "Primary",
    },

    addresses: {
      addAddress: "Add Address",
      addressesCount: (count: number) => `${count} shipping address(es)`,
      default: "Default",
    },

    documents: {
      sectionTitle: "Documents",
      uploadDocument: "Upload Document",
      uploadDialogTitle: "Upload Document",
      uploadDialogDescription: "Upload customer documents for verification.",
      cancel: "Cancel",
      upload: "Upload",
      tableHeaders: {
        documentType: "Document Type",
        fileName: "File Name",
        status: "Status",
        uploaded: "Uploaded",
      },
      kycTitle: (passed: number, total: number) =>
        `KYC Checklist (${passed}/${total} passed)`,
      kycTableHeaders: {
        item: "Item",
        status: "Status",
        verifiedBy: "Verified By",
        date: "Date",
        notes: "Notes",
      },
    },

    financials: {
      creditAndTerms: "Credit & Terms",
      recentOrders: "Recent Orders",
      recentOrdersEmpty: "View order history in the",
      recentOrdersEmptyLink: "CRM",
      recentOrdersEmptyModule: "module.",
      stats: {
        totalOrders: "Total Orders",
        totalRevenue: "Total Revenue",
        outstanding: "Outstanding",
        overdue: "Overdue",
      },
      infoLabels: {
        creditLimit: "Credit Limit",
        paymentTerms: "Payment Terms",
        pricingTier: "Pricing Tier",
      },
    },

    rentals: {
      tableHeaders: {
        contract: "Contract #",
        devices: "Devices",
        status: "Status",
        start: "Start",
        end: "End",
        monthlyRate: "Monthly Rate",
      },
      devicesCount: (count: number) => `${count} device(s)`,
      empty: "No rental contracts linked to this customer.",
    },

    sidebar: {
      accountManager: "Account Manager",
      financialSummary: "Financial Summary",
      financialLabels: {
        outstanding: "Outstanding",
        overdue: "Overdue",
        creditLimit: "Credit Limit",
        paymentTerms: "Payment Terms",
      },
      quickInfo: "Quick Info",
      quickInfoLabels: {
        status: "Status",
        type: "Type",
        city: "City",
        pricingTier: "Pricing Tier",
        totalOrders: "Total Orders",
      },
      approval: "Approval",
      approvalLabels: {
        approvedBy: "Approved By",
        date: "Date",
      },
      notes: "Notes",
    },

    approveDialog: {
      title: "Approve Customer",
      description: (name: string) =>
        `Approve "${name}" as a registered customer?`,
      cancel: "Cancel",
      approve: "Approve",
    },

    deactivateDialog: {
      title: "Deactivate Customer",
      description: (name: string) =>
        `Are you sure you want to deactivate "${name}"?`,
      cancel: "Cancel",
      deactivate: "Deactivate",
    },

    rejectDialog: {
      title: "Reject Customer",
      description: "Provide a reason for rejecting this customer registration.",
      placeholder: "Rejection reason...",
      cancel: "Cancel",
      reject: "Reject",
    },

    // Header actions
    headerActions: {
      edit: "Edit",
      approve: "Approve",
      deactivate: "Deactivate",
    },
  },

  form: {
    editTitle: "Edit Customer",
    registerTitle: "Register Customer",
    editSubtitle: (name: string) => `Editing ${name}`,
    registerSubtitle: "Complete all steps to register a new customer.",
    stepProgress: (current: number, total: number, label: string) =>
      `Step ${current} of ${total} — ${label}`,
    cancel: "Cancel",
    previous: "Previous",
    next: "Next",
    submit: "Submit",

    steps: {
      company: {
        cardTitle: "Company Details",
        reviewTitle: "Company Details",
        fields: {
          customerType: "Customer Type",
          customerTypePlaceholder: "Select type",
          companyName: "Company Name",
          companyNamePlaceholder: "Enter company name",
          industry: "Industry",
          industryPlaceholder: "e.g. IT Services",
          website: "Website",
          websitePlaceholder: "https://",
        },
      },

      billing: {
        cardTitle: "Billing Address",
        reviewTitle: "Billing Address",
        fields: {
          address: "Address",
          addressPlaceholder: "Street address",
          city: "City",
          cityPlaceholder: "City",
          state: "State",
          statePlaceholder: "State",
          pincode: "Pincode",
          pincodePlaceholder: "PIN Code",
        },
      },

      shipping: {
        cardTitle: "Shipping Addresses",
        addAddress: "Add Address",
        empty: 'No shipping addresses added yet. Click "Add Address" to begin.',
        reviewTitle: (count: number) => `Shipping Addresses (${count})`,
        noShippingAddresses: "No shipping addresses added",
        addressLabel: (idx: number) => `Address #${idx + 1}`,
        defaultBadge: "Default",
        yes: "Yes",
        fields: {
          label: "Label",
          labelPlaceholder: "e.g. Head Office",
          address: "Address",
          addressPlaceholder: "Street address",
          city: "City",
          cityPlaceholder: "City",
          state: "State",
          statePlaceholder: "State",
          pincode: "Pincode",
          pincodePlaceholder: "PIN Code",
          contactPerson: "Contact Person",
          contactPersonPlaceholder: "Full name",
          contactPhone: "Contact Phone",
          contactPhonePlaceholder: "+91 XXXXX XXXXX",
          defaultAddress: "Default address",
        },
        tableHeaders: {
          label: "Label",
          city: "City",
          contact: "Contact",
          default: "Default",
        },
      },

      contacts: {
        cardTitle: "Contacts",
        addContact: "Add Contact",
        empty: 'No contacts added yet. Click "Add Contact" to begin.',
        reviewTitle: (count: number) => `Contacts (${count})`,
        noContacts: "No contacts added",
        contactLabel: (idx: number) => `Contact #${idx + 1}`,
        primaryBadge: "Primary",
        yes: "Yes",
        fields: {
          name: "Name",
          namePlaceholder: "Full name",
          email: "Email",
          emailPlaceholder: "email@example.com",
          phone: "Phone",
          phonePlaceholder: "+91 XXXXX XXXXX",
          designation: "Designation",
          designationPlaceholder: "e.g. Manager - IT",
          role: "Role",
          rolePlaceholder: "Select role",
          primaryContact: "Primary contact",
        },
        tableHeaders: {
          name: "Name",
          email: "Email",
          role: "Role",
          primary: "Primary",
        },
      },

      credit: {
        cardTitle: "Credit Terms",
        reviewTitle: "Credit Terms",
        fields: {
          creditLimit: "Credit Limit (₹)",
          creditLimitPlaceholder: "e.g. 5000000",
          paymentTerms: "Payment Terms",
          paymentTermsPlaceholder: "Select terms",
          pricingTier: "Pricing Tier",
          pricingTierPlaceholder: "Select tier",
          creditLimitReview: "Credit Limit",
          paymentTermsReview: "Payment Terms",
          pricingTierReview: "Pricing Tier",
        },
      },

      documents: {
        uploadCardTitle: "Document Upload",
        kycCardTitle: "KYC Checklist (Preview)",
        uploadHint:
          "Upload required documents: PAN Card, GST Certificate, Credit Application, Address Proof, etc.",
        kycHint: "KYC verification will be performed after submission.",
        kycPending: "Pending",
        reviewTitle: "Documents",
        filesReady: (count: number) => `${count} file(s) ready to upload`,
        existingDocuments: (count: number) => `${count} existing document(s)`,
        noDocuments: "No documents uploaded",
      },

      review: {
        cardTitle: "Review & Submit",
        typeLabel: "Type",
        companyNameLabel: "Company Name",
        industryLabel: "Industry",
        websiteLabel: "Website",
      },
    },
  },
} as const

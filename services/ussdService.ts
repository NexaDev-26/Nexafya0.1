/**
 * USSD Fallback Service
 * Provides USSD menu system for feature phones
 * Dial *150*60# to access NexaFya services
 */

export interface USSDMenu {
  code: string;
  title: string;
  options: USSDOption[];
}

export interface USSDOption {
  number: string;
  label: string;
  action: string;
  nextMenu?: string;
}

export interface USSDResponse {
  message: string;
  nextMenu?: USSDMenu;
  endSession: boolean;
}

class USSDService {
  /**
   * Main USSD menu
   */
  private mainMenu: USSDMenu = {
    code: '*150*60#',
    title: 'NexaFya Health Services',
    options: [
      { number: '1', label: 'Book Appointment', action: 'BOOK_APPOINTMENT', nextMenu: 'appointment' },
      { number: '2', label: 'Check Medicine', action: 'CHECK_MEDICINE', nextMenu: 'medicine' },
      { number: '3', label: 'Health Tips', action: 'HEALTH_TIPS', nextMenu: 'tips' },
      { number: '4', label: 'Emergency SOS', action: 'EMERGENCY', nextMenu: 'emergency' },
      { number: '5', label: 'My Account', action: 'ACCOUNT', nextMenu: 'account' },
      { number: '0', label: 'Exit', action: 'EXIT', nextMenu: undefined },
    ],
  };

  /**
   * Appointment menu
   */
  private appointmentMenu: USSDMenu = {
    code: '*150*60*1#',
    title: 'Book Appointment',
    options: [
      { number: '1', label: 'General Doctor', action: 'BOOK_GENERAL' },
      { number: '2', label: 'Specialist', action: 'BOOK_SPECIALIST' },
      { number: '3', label: 'View Appointments', action: 'VIEW_APPOINTMENTS' },
      { number: '0', label: 'Back', action: 'BACK', nextMenu: 'main' },
    ],
  };

  /**
   * Medicine menu
   */
  private medicineMenu: USSDMenu = {
    code: '*150*60*2#',
    title: 'Check Medicine',
    options: [
      { number: '1', label: 'Search Medicine', action: 'SEARCH_MEDICINE' },
      { number: '2', label: 'Order Medicine', action: 'ORDER_MEDICINE' },
      { number: '3', label: 'Track Order', action: 'TRACK_ORDER' },
      { number: '0', label: 'Back', action: 'BACK', nextMenu: 'main' },
    ],
  };

  /**
   * Health tips menu
   */
  private tipsMenu: USSDMenu = {
    code: '*150*60*3#',
    title: 'Health Tips',
    options: [
      { number: '1', label: 'Malaria Prevention', action: 'TIP_MALARIA' },
      { number: '2', label: 'COVID-19 Info', action: 'TIP_COVID' },
      { number: '3', label: 'Diabetes Management', action: 'TIP_DIABETES' },
      { number: '0', label: 'Back', action: 'BACK', nextMenu: 'main' },
    ],
  };

  /**
   * Emergency menu
   */
  private emergencyMenu: USSDMenu = {
    code: '*150*60*4#',
    title: 'Emergency SOS',
    options: [
      { number: '1', label: 'Activate SOS', action: 'ACTIVATE_SOS' },
      { number: '2', label: 'Nearest Hospital', action: 'NEAREST_HOSPITAL' },
      { number: '0', label: 'Back', action: 'BACK', nextMenu: 'main' },
    ],
  };

  /**
   * Account menu
   */
  private accountMenu: USSDMenu = {
    code: '*150*60*5#',
    title: 'My Account',
    options: [
      { number: '1', label: 'View Balance', action: 'VIEW_BALANCE' },
      { number: '2', label: 'NHIF Status', action: 'NHIF_STATUS' },
      { number: '3', label: 'Health Records', action: 'HEALTH_RECORDS' },
      { number: '0', label: 'Back', action: 'BACK', nextMenu: 'main' },
    ],
  };

  /**
   * Get menu by code
   */
  getMenu(menuCode: string): USSDMenu | null {
    switch (menuCode) {
      case '*150*60#':
      case 'main':
        return this.mainMenu;
      case '*150*60*1#':
      case 'appointment':
        return this.appointmentMenu;
      case '*150*60*2#':
      case 'medicine':
        return this.medicineMenu;
      case '*150*60*3#':
      case 'tips':
        return this.tipsMenu;
      case '*150*60*4#':
      case 'emergency':
        return this.emergencyMenu;
      case '*150*60*5#':
      case 'account':
        return this.accountMenu;
      default:
        return null;
    }
  }

  /**
   * Process USSD input
   */
  processInput(menuCode: string, input: string, phoneNumber: string): USSDResponse {
    const menu = this.getMenu(menuCode);
    if (!menu) {
      return {
        message: 'Invalid menu code. Please dial *150*60# to start.',
        endSession: true,
      };
    }

    const option = menu.options.find(opt => opt.number === input);
    if (!option) {
      return {
        message: `Invalid option. Please select from:\n${menu.options.map(opt => `${opt.number}. ${opt.label}`).join('\n')}`,
        endSession: false,
        nextMenu: menu,
      };
    }

    // Handle actions
    switch (option.action) {
      case 'EXIT':
        return {
          message: 'Thank you for using NexaFya. Goodbye!',
          endSession: true,
        };

      case 'BACK':
        if (option.nextMenu) {
          const backMenu = this.getMenu(option.nextMenu);
          return {
            message: backMenu
              ? `${backMenu.title}\n${backMenu.options.map(opt => `${opt.number}. ${opt.label}`).join('\n')}`
              : 'Menu not found.',
            endSession: false,
            nextMenu: backMenu || undefined,
          };
        }
        break;

      case 'BOOK_APPOINTMENT':
      case 'BOOK_GENERAL':
      case 'BOOK_SPECIALIST':
        return {
          message: 'To book an appointment, please:\n1. Visit nexafya.com\n2. Use our mobile app\n3. Call +255 123 456 789\n\nOr reply with your preferred date (DD/MM/YYYY)',
          endSession: false,
          nextMenu: this.appointmentMenu,
        };

      case 'SEARCH_MEDICINE':
        return {
          message: 'To search for medicine, please reply with the medicine name or visit nexafya.com/pharmacy',
          endSession: false,
          nextMenu: this.medicineMenu,
        };

      case 'ACTIVATE_SOS':
        return {
          message: 'EMERGENCY ALERT ACTIVATED!\n\nYour location has been shared with emergency services. Help is on the way.\n\nFor immediate help, call:\n+255 112 (Emergency)\n+255 114 (Ambulance)',
          endSession: true,
        };

      case 'TIP_MALARIA':
        return {
          message: 'MALARIA PREVENTION:\n\n1. Use mosquito nets\n2. Apply repellent\n3. Remove standing water\n4. Take preventive medication if prescribed\n\nFor more info, visit nexafya.com',
          endSession: false,
          nextMenu: this.tipsMenu,
        };

      case 'NHIF_STATUS':
        return {
          message: 'To check your NHIF status, please:\n1. Visit nexafya.com/profile\n2. Call NHIF: +255 22 212 1234\n3. Reply with your NHIF number',
          endSession: false,
          nextMenu: this.accountMenu,
        };

      default:
        if (option.nextMenu) {
          const nextMenu = this.getMenu(option.nextMenu);
          return {
            message: nextMenu
              ? `${nextMenu.title}\n${nextMenu.options.map(opt => `${opt.number}. ${opt.label}`).join('\n')}`
              : 'Menu not found.',
            endSession: false,
            nextMenu: nextMenu || undefined,
          };
        }
    }

    return {
      message: 'Action processed. Thank you!',
      endSession: true,
    };
  }

  /**
   * Format menu for display
   */
  formatMenu(menu: USSDMenu): string {
    let message = `${menu.title}\n\n`;
    menu.options.forEach(opt => {
      message += `${opt.number}. ${opt.label}\n`;
    });
    return message;
  }

  /**
   * Get USSD instructions
   */
  getInstructions(): string {
    return `NexaFya USSD Service\n\nDial: *150*60#\n\nAvailable on all networks:\n- Vodacom\n- Tigo\n- Airtel\n- Halotel\n\nNo internet required!`;
  }
}

export const ussdService = new USSDService();
export default ussdService;


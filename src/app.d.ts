declare global {
  namespace App {
    interface Locals {
      role: 'employe' | 'patron' | null;
    }
  }
}

export {};

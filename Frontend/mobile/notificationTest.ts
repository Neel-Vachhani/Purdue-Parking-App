import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INITIAL_GARAGES, InitialGarage } from "./data/initialGarageAvailability";
import { USER_PERMIT } from "./data/dummyPermit";
import { PASS_PRICING } from "./data/dummySale";


type NotifPrefs = {
  garageFull: boolean;
  permitExpiring: boolean;
  eventClosures: boolean;
  priceDrop: boolean;
  //passOnSale: boolean;
  favoriteLotClosed: boolean,
  //favoriteLotAlerts: boolean;
  //favoriteLotThreshold: number;
  //frequency: "realtime" | "daily" | "weekly";
};


export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function getPrefs(): Promise<NotifPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem("notification_prefs");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function areAllNotificationsDisabled(): Promise<boolean> {
  const prefs = await getPrefs();
  if (!prefs) return true;
  return (
    !prefs.garageFull &&
    !prefs.permitExpiring &&
    !prefs.eventClosures &&
    !prefs.priceDrop &&
    //!prefs.passOnSale &&
    !prefs.favoriteLotClosed
    //!prefs.favoriteLotAlerts
  );
}

async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {

  console.log(` Sending notification: "${title}" - "${body}"`);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: data ?? {},
    },
    trigger: { type:  Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
              seconds: 1, 
              repeats: false }, //null for immediate
  });

  console.log(`Notification scheduled with ID: ${id}`);
}

export async function checkGarageFullAlerts(
  garages: InitialGarage[] = INITIAL_GARAGES
) {
  const prefs = await getPrefs();
  if (!prefs?.garageFull) return;

  for (const garage of garages) {
    if (garage.current === 0) {
      await sendLocalNotification(
        `${garage.name} is full`,
        `No available spots (0/${garage.total}).`,
        { garageCode: garage.code, type: "garageFull" }
      );
    }
  }
}


export async function checkFavoriteLotClosedAlerts(
  garages: InitialGarage[] = INITIAL_GARAGES
) {
  const prefs = await getPrefs();
  if (!prefs?.favoriteLotClosed) return;

  for (const garage of garages) {
    if (garage.favorite && garage.current === 0) {
      await sendLocalNotification(
        `Favorite Lot Closed    `,
        `${garage.name} is currently full.`,
        { garageCode: garage.code, type: "favoriteClosed" }
      );
    }
  }
}


export async function checkPermitExpiringAlerts() {
  const prefs = await getPrefs();
  if (!prefs?.permitExpiring) return; 
  if (!USER_PERMIT?.expirationDate) return;

  const expDate = new Date(USER_PERMIT.expirationDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 0) {
    await sendLocalNotification(
      `Permit Expired`,
      `Your ${USER_PERMIT.type} parking permit has expired.`,
      { type: "permitExpired" }
    );
  } else if (daysUntilExpiry <= 7) {
    await sendLocalNotification(
      `Permit Expiring`,
      `Your ${USER_PERMIT.type} permit expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}.`,
      { type: "permitExpiring", daysLeft: daysUntilExpiry }
    );
  } else if (daysUntilExpiry <= 30) {
    await sendLocalNotification(
      `Permit Reminder`,
      `Your ${USER_PERMIT.type} permit expires in ${daysUntilExpiry} days.`,
      { type: "permitExpiring", daysLeft: daysUntilExpiry }
    );
  }
}



export async function checkPriceDropAlerts() {
  const prefs = await getPrefs();
  if (!prefs?.priceDrop) return; 

  for (const pass of PASS_PRICING) {
    if (pass.currentPrice < pass.previousPrice) {
      const savings = (pass.previousPrice - pass.currentPrice).toFixed(2);
      const percentOff = (
        ((pass.previousPrice - pass.currentPrice) / pass.previousPrice) * 100
      ).toFixed(0);

      await sendLocalNotification(
        `Price Drop`,
        `${pass.label} dropped from $${pass.previousPrice} to $${pass.currentPrice}.`,
        {
          type: "priceDrop",
          passType: pass.passType,
          oldPrice: pass.previousPrice,
          newPrice: pass.currentPrice,
        }
      );
    }
  }
}


export async function disableAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);

  const disabledPrefs: NotifPrefs = {
    garageFull: false,
    permitExpiring: false,
    eventClosures: false,
    priceDrop: false,
    favoriteLotClosed: false,
    //passOnSale: false,
    //favoriteLotAlerts: false,
    //favoriteLotThreshold: 25,
    //frequency: "realtime",
  };
  await AsyncStorage.setItem("notification_prefs", JSON.stringify(disabledPrefs));
  return disabledPrefs;
}

export async function runAllNotificationChecks(
  garages: InitialGarage[] = INITIAL_GARAGES
) {
  if (await areAllNotificationsDisabled()) {
    console.log("All notifications disabled.");
    return;
  }

  await checkGarageFullAlerts(garages);
  await checkFavoriteLotClosedAlerts(garages);
  await checkPermitExpiringAlerts();
  await checkPriceDropAlerts();

  console.log("Notification checks complete.");
}
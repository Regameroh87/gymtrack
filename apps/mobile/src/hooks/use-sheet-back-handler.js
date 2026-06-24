import { useEffect } from "react";
import { BackHandler } from "react-native";

export function useSheetBackHandler(sheetRef, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      sheetRef.current?.dismiss();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, sheetRef]);
}

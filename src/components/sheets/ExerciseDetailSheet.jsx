import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { database } from "../../database";
import {
  exercise_equipment as exerciseEquipmentTable,
  equipment as equipmentTable,
} from "../../database/schemas";
import { getCloudinaryUrl } from "../../utils/cloudinary";
import PreviewVideo from "../videos/PreviewVideo";
import { Barbell, Pencil, Trash } from "../../../assets/icons";
import { ui, brandPrimary, brandSecondary } from "../../theme/colors";

const SNAP_POINTS = ["92%"];

export default function ExerciseDetailSheet({
  sheetRef,
  exercise,
  onEdit,
  onDelete,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: equipmentList = [] } = useQuery({
    queryKey: ["exercise_equipment_detail", exercise?.id],
    enabled: !!exercise?.id,
    queryFn: async () => {
      const rows = await database
        .select({
          name: equipmentTable.name,
          sync_status: exerciseEquipmentTable.sync_status,
        })
        .from(exerciseEquipmentTable)
        .innerJoin(
          equipmentTable,
          eq(exerciseEquipmentTable.equipment_id, equipmentTable.id)
        )
        .where(eq(exerciseEquipmentTable.exercise_id, exercise.id))
        .execute();
      return rows.filter((r) => r.sync_status !== "deleted");
    },
  });

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const imageUrl = exercise?.image_uri
    ? (getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;

  const videoUrl = exercise?.youtube_video_url || exercise?.video_uri || null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark
          ? ui.surfaceSecondary.dark
          : ui.surfaceSecondary.light,
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View
          className="mx-5 mt-3 rounded-2xl overflow-hidden"
          style={{ height: 220 }}
        >
          {imageUrl ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={["transparent", "rgba(12,10,29,0.55)"]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "55%",
                }}
                pointerEvents="none"
              />
            </>
          ) : (
            <View className="flex-1 bg-brandSecondary-200/10 items-center justify-center">
              <Barbell size={52} color={brandSecondary[500]} />
            </View>
          )}
        </View>

        {/* Name + Badges */}
        <View className="px-5 mt-4">
          <Text className="text-[22px] font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            {exercise?.name}
          </Text>
          <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
            {exercise?.category && (
              <View className="px-2.5 py-1 rounded-full bg-brandPrimary-100 dark:bg-brandPrimary-950">
                <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-brandPrimary-600 dark:text-brandPrimary-400">
                  {exercise.category}
                </Text>
              </View>
            )}
            {exercise?.muscle_group && (
              <View className="px-2.5 py-1 rounded-full bg-brandSecondary-100 dark:bg-brandSecondary-900">
                <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-brandSecondary-700 dark:text-brandSecondary-300">
                  {exercise.muscle_group}
                </Text>
              </View>
            )}
            {exercise?.is_unilateral && (
              <View className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Unilateral
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Separator */}
        <View className="mx-5 mt-5 border-t border-ui-input-border" />

        {/* Instructions */}
        {exercise?.instructions ? (
          <View className="px-5 mt-5">
            <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
              Instrucciones
            </Text>
            <Text className="text-sm font-manrope leading-relaxed text-ui-text-main dark:text-ui-text-mainDark">
              {exercise.instructions}
            </Text>
          </View>
        ) : null}

        {/* Video */}
        {videoUrl ? (
          <View className="px-5 mt-5">
            <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-ui-text-muted dark:text-ui-text-mutedDark mb-3">
              Video
            </Text>
            <PreviewVideo videoUrl={videoUrl} />
          </View>
        ) : null}

        {/* Equipment */}
        {equipmentList.length > 0 ? (
          <View className="px-5 mt-5">
            <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
              Equipamiento
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {equipmentList.map((item, i) => (
                <View
                  key={i}
                  className="px-3 py-1.5 rounded-xl border border-ui-input-border bg-ui-input-light dark:bg-ui-input-dark"
                >
                  <Text className="text-sm font-manrope text-ui-text-main dark:text-ui-text-mainDark">
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Separator */}
        <View className="mx-5 mt-6 border-t border-ui-input-border" />

        {/* Actions */}
        <View className="px-5 mt-5 flex-row" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              sheetRef.current?.dismiss();
              setTimeout(() => onEdit?.(exercise), 350);
            }}
            className="flex-1 flex-row items-center justify-center py-4 rounded-2xl bg-brandPrimary-100 dark:bg-brandPrimary-900/30 active:scale-[0.97]"
            style={{ gap: 8 }}
          >
            <Pencil size={16} color={brandPrimary[600]} />
            <Text className="font-jakarta-semi text-brandPrimary-600 dark:text-brandPrimary-400">
              Editar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              sheetRef.current?.dismiss();
              setTimeout(() => onDelete?.(exercise), 350);
            }}
            className="flex-1 flex-row items-center justify-center py-4 rounded-2xl bg-red-100 dark:bg-red-900/30 active:scale-[0.97]"
            style={{ gap: 8 }}
          >
            <Trash size={16} color="#ef4444" />
            <Text className="font-jakarta-semi text-red-500 dark:text-red-400">
              Eliminar
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

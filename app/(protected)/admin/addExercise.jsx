import { View, TextInput, Text, ScrollView, Pressable } from "react-native";
import { useForm } from "@tanstack/react-form";
import CustomSelect from "../../../src/components/CustomSelect";
import { Barbell, Movie, Upload } from "../../../assets/icons";
import { ui, brandPrimary } from "../../../src/theme/colors";

export default function AddExercise() {
  const categories = [
    { label: "Fuerza", value: "fuerza" },
    { label: "Cardio", value: "cardio" },
    { label: "Flexibilidad", value: "flexibilidad" },
    { label: "Potencia", value: "potencia" },
  ];

  const muscleGroups = [
    { label: "Pecho", value: "pecho" },
    { label: "Espalda", value: "espalda" },
    { label: "Piernas", value: "piernas" },
    { label: "Hombros", value: "hombros" },
    { label: "Brazos", value: "brazos" },
    { label: "Core", value: "core" },
  ];

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      muscle_group: "",
      equipment: "",
    },
    onSubmit: (data) => {
      console.log(data);
    },
  });

  return (
    <ScrollView className="flex-1 p-4 bg-ui-background dark:bg-ui-backgroundDark">
      <View className="mb-6">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend-light mb-2 uppercase tracking-wider">
          NOMBRE DEL EJERCICIO
        </Text>
        <form.Field name="name">
          {(field) => (
            <TextInput
              value={field.state.value}
              onChangeText={field.handleChange}
              placeholder="Ej: Press de Banca"
              placeholderTextColor="#64748b"
              className="dark:bg-ui-input-dark bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-lexend"
            />
          )}
        </form.Field>
      </View>
      <View className="flex-row w-full justify-center gap-2">
        <View className="w-1/2">
          <form.Field name="category">
            {(field) => (
              <CustomSelect
                label="CATEGORIA"
                options={categories}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </View>

        <View className="w-1/2">
          <form.Field name="muscle_group">
            {(field) => (
              <CustomSelect
                label="GRUPO MUSCULAR"
                options={muscleGroups}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </View>
      </View>
      <View>
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend-light mb-2 uppercase tracking-wider">
          EQUIPAMIENTO
        </Text>
        <form.Field name="equipment">
          {(field) => (
            <View className=" flex relative">
              <View className=" absolute top-0 left-1 translate-y-1/2 z-10 rotate-45">
                <Barbell color={ui.text.mutedDark} />
              </View>
              <View>
                <TextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Mancuernas"
                  placeholderTextColor="#64748b"
                  className="dark:bg-ui-input-dark pl-10 bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-lexend"
                />
              </View>
            </View>
          )}
        </form.Field>
      </View>
      <View>
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend-light mb-2 uppercase tracking-wider">
          MULTIMEDIA
        </Text>
        <View className=" flex border border-l-4 border-brandPrimary-600 rounded-2xl p-4">
          <View className="flex-row items-center mb-4">
            <Movie color={brandPrimary[600]} className="ml-4" />
            <Text className="text-ui-text-main dark:text-ui-text-mainDark font-lexend tracking-tighter ml-2">
              VIDEO (URL O SUBIR)
            </Text>
          </View>
          <View>
            <form.Field name="video_url">
              {(field) => (
                <TextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  placeholderTextColor="#64748b"
                  className="dark:bg-ui-input-dark bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-lexend"
                />
              )}
            </form.Field>
          </View>
          <View className=" mt-4">
            <Pressable
              onPress={() => {}}
              className=" flex flex-row bg-ui-secondary-light dark:bg-ui-secondary-dark items-center justify-center border border-dashed border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-6 gap-2"
            >
              <Upload color={ui.text.mutedDark} />
              <Text className=" text-center text-ui-text-muted dark:text-ui-text-mutedDark font-lexend tracking-tighter">
                Subir Video
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

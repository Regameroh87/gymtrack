import { View, TextInput, Text, Image, Pressable } from "react-native";
import { useForm } from "@tanstack/react-form";
import * as ImagePicker from "expo-image-picker";
import { Polaroid } from "../assets/icons";

export default function Sandbox() {
  const form = useForm({
    defaultValues: {
      email: "",
      options: {
        data: {
          name: "",
          lastName: "",
          imageProfile: "",
          phone: "",
        },
      },
    },
    onSubmit: (values) => {
      console.log(values);
    },
  });
  return (
    <View className="flex-1 items-center justify-center bg-primary-light dark:bg-primary-dark px-6">
      <View className=" flex flex-col items-center w-full my-4">
        <form.Field name="options.data.imageProfile">
          {(field) => (
            <>
              {field.state.value ? (
                <Image
                  source={{ uri: field.state.value ?? "" }}
                  width={100}
                  height={100}
                />
              ) : (
                <View className="flex items-center justify-center bg-lime-500/20 p-6 rounded-full">
                  <Polaroid className="text-slate-400" width={80} height={80} />
                </View>
              )}

              <Pressable
                onPress={async () => {
                  const { status } =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== "granted") {
                    alert(
                      "Sorry, we need camera roll permissions to make this work!"
                    );
                    return;
                  }
                  let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 1,
                  });
                  if (!result.canceled) {
                    field.handleChange(result.assets[0].uri);
                  }
                }}
              >
                <Text>Seleccionar Imagen</Text>
              </Pressable>
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full my-4">
        <Text className="text-slate-700 dark:text-slate-300 mb-4">
          Nombre(s)
        </Text>
        <form.Field name="options.data.name">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Juan pablo"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md p-4"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 mb-4">
          Apellido(s)
        </Text>
        <form.Field name="options.data.lastName">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Perez Garcia"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md p-4"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full my-4">
        <Text className="text-slate-700 dark:text-slate-300 mb-4">
          Correo Electronico
        </Text>
        <form.Field name="email">
          {(field) => (
            <>
              <TextInput
                placeholder="juan.perez@ejemplo.com"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md p-4"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 mb-4">
          Telefono
        </Text>
        <form.Field name="options.data.phone">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: 123456789"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md p-4"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
            </>
          )}
        </form.Field>
      </View>
    </View>
  );
}

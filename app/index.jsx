import {
  View,
  TextInput,
  Text,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { useForm } from "@tanstack/react-form";
import * as ImagePicker from "expo-image-picker";
import { Polaroid, Mail, Phone } from "../assets/icons";
import { uploadToCloudinary } from "../src/utils/uploadImage.js";

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
          documentNumber: "",
          address: "",
        },
      },
    },
    onSubmit: (values) => {
      console.log(values);
    },
  });
  return (
    <ScrollView
      className="flex-1 bg-primary-light dark:bg-primary-dark"
      contentContainerClassName="items-center justify-center px-6"
    >
      <View className=" flex flex-col items-center w-full my-4">
        <form.Field name="options.data.imageProfile">
          {(field) => (
            <>
              <Pressable
                onPress={async () => {
                  const { status } =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== "granted") {
                    alert(
                      "Disculpa, necesitamos permisos para acceder a la galeria"
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
                    const URL = await uploadToCloudinary(result.assets[0].uri);
                    field.handleChange(URL);
                    console.log(URL);
                  }
                }}
                className="flex items-center justify-center"
              >
                {field.state.value ? (
                  <Image
                    source={{ uri: field.state.value ?? "" }}
                    className="rounded-full"
                    width={32}
                    height={32}
                  />
                ) : (
                  <View className="flex items-center justify-center bg-lime-500/20 p-6 rounded-full">
                    <Polaroid
                      className="text-slate-400"
                      width={32}
                      height={32}
                    />
                  </View>
                )}
                <Text className="text-slate-700 dark:text-slate-300 mt-2">
                  Seleccionar Imagen
                </Text>
              </Pressable>
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full mt-2">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
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
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
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
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Correo Electronico
        </Text>
        <form.Field name="email">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="juan.perez@ejemplo.com"
                className="flex-1 w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-10"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <Mail color="#9ca3af" size={18} style={{ marginRight: -5 }} />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Telefono
        </Text>
        <form.Field name="options.data.phone">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="Ej: 123456789"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-10"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <Phone
                    color="#9ca3af"
                    size={18}
                    style={{ marginRight: -5 }}
                  />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          N° de Documento
        </Text>
        <form.Field name="options.data.documentNumber">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: 123456789"
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
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Direccion
        </Text>
        <form.Field name="options.data.address">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Calle 123"
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
    </ScrollView>
  );
}

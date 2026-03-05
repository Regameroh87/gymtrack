import { View, TextInput, Text } from "react-native";
import { useForm } from "@tanstack/react-form";

export default function Sandbox() {
  const form = useForm({
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      imageProfile: "",
    },
    onSubmit: (values) => {
      console.log(values);
    },
  });
  return (
    <View className="flex-1 items-center justify-center bg-primary-light dark:bg-primary-dark px-6">
      <View className=" flex flex-col w-full my-4">
        <Text className="text-slate-700 dark:text-slate-300 mb-4">
          Nombre(s)
        </Text>
        <form.Field name="name">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Juan pablo"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md p-4"
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
        <form.Field name="lastName">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Perez Garcia"
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md p-4"
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
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md p-4"
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
    </View>
  );
}

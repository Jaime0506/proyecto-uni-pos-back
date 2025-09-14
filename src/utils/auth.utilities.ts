import { hash, compare } from 'bcrypt';

export const hashPassword = async (password: string) => {
	return await hash(password, 10);
};

export const comparePassword = async (
	password: string,
	hashedPassword: string,
) => {
	return await compare(password, hashedPassword);
};

// Funcion que recibe el primer nombre y el primer apellido y la cedula y retorna el username con la convinacion
// del primer nombre, el primer apellido y los ultimos 3 digitos de la cedula ejemplon: john.doe.123

export const createUserName = (
	firstName: string,
	lastName: string,
	nationalId: string,
) => {
	const clean = (str: string) =>
		str
			.normalize('NFD') // descompone tildes y diacríticos
			.replace(/[\u0300-\u036f]/g, '') // elimina diacríticos
			.replace(/ñ/g, 'n')
			.replace(/Ñ/g, 'n')
			.toLowerCase()
			.split(' ')[0]
			.trim();

	return `${clean(firstName)}.${clean(lastName)}${nationalId.slice(-3)}`;
};

export interface RequestUser {
	userId: string;
	username: string;
	sessionId: number;
	jti: string;
	companyId: number | null;
	isSuperRoot: boolean;
}

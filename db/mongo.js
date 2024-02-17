import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: { type: String, unique: true },
    telegramUsername: String,
    tolokaUserCookies: String,
});

const User = mongoose.model('User', userSchema);

const connect = async () => {

    const conn = await mongoose.connect(process.env.DB_STRING, { dbName: 'Toloka' })

    if (conn.connection.readyState === 1) console.log('Connected to MongoDB')

}

const createUser = async (telegramId, telegramUsername) => {
    try {
        const user = new User({ telegramId, telegramUsername });

        await user.save();

        return user;
    } catch (error) {
        console.error("Error creating user:", error.message);
    }
}

const addTolokaUserCookies = async (telegramId, cookies) => {
    try {
        const user = await User.findOne({ telegramId });

        user.tolokaUserCookies = cookies;

        await user.save();

        return user;
    } catch (error) {
        console.error("Error adding cookies:", error.message);
    }
}

const getTolokaUserCookies = async (telegramId) => {
    try {
        const user = await User.findOne({ telegramId });

        return user.tolokaUserCookies;
    } catch (error) {
        console.error("Error getting cookies:", error.message);
    }
}

const removeTolokaUserCookies = async (telegramId) => {
    try {
        const user = await User.findOne({ telegramId });

        user.tolokaUserCookies = null;

        await user.save();

        return user;
    } catch (error) {
        console.error("Error removing cookies:", error.message);
    }
}


export {
    connect,
    createUser,
    addTolokaUserCookies,
    getTolokaUserCookies,
    removeTolokaUserCookies
};
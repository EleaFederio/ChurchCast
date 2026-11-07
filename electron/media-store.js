const { mkdir, readFile, rename, writeFile } = require('node:fs/promises')
const path = require('node:path')

const mediaTypes = {
  image: new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
  ]),
  video: new Map([['video/mp4', 'mp4']]),
}
const maxFileSize = 300 * 1024 * 1024
const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateMedia(media) {
  if (
    !media ||
    typeof media !== 'object' ||
    !mediaIdPattern.test(media.id) ||
    typeof media.name !== 'string' ||
    !media.name.trim() ||
    media.name.length > 255 ||
    !mediaTypes[media.type] ||
    typeof media.src !== 'string'
  ) {
    throw new Error('Provide a valid JPEG, PNG, or MP4 media file.')
  }

  const match = media.src.match(/^data:(image\/jpeg|image\/png|video\/mp4);base64,([A-Za-z0-9+/]*={0,2})$/)
  const expectedMime = media.type === 'video' ? 'video/mp4' : null
  if (!match || (expectedMime && match[1] !== expectedMime) || (!expectedMime && !match[1].startsWith('image/'))) {
    throw new Error(`The uploaded media file "${media.name}" has an invalid format.`)
  }

  const contents = Buffer.from(match[2], 'base64')
  if (!contents.length || contents.length > maxFileSize || contents.toString('base64') !== match[2]) {
    throw new Error(`The uploaded media file "${media.name}" is empty or exceeds the 300 MB limit.`)
  }

  return { id: media.id, name: media.name, type: media.type, mime: match[1], contents }
}

function createMediaStore(directory) {
  const metadataPath = path.join(directory, 'library.json')

  async function readLibrary() {
    try {
      const contents = await readFile(metadataPath, 'utf8')
      const library = JSON.parse(contents)
      if (!Array.isArray(library)) throw new Error('The saved media library has an invalid format.')
      return library
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  async function writeLibrary(library) {
    const temporaryPath = `${metadataPath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(library), 'utf8')
    await rename(temporaryPath, metadataPath)
  }

  return {
    async list() {
      await mkdir(directory, { recursive: true })
      const library = await readLibrary()
      return Promise.all(
        library.map(async ({ id, name, type, mime }) => ({
          id,
          name,
          type,
          src: `data:${mime};base64,${(await readFile(path.join(directory, `${id}.${mediaTypes[type].get(mime)}`))).toString('base64')}`,
        })),
      )
    },
    async saveMany(mediaItems) {
      if (!Array.isArray(mediaItems) || mediaItems.length === 0 || mediaItems.length > 100) {
        throw new Error('Select between 1 and 100 media files to save.')
      }

      const validatedMedia = mediaItems.map(validateMedia)
      await mkdir(directory, { recursive: true })
      const library = await readLibrary()
      const nextLibrary = [...library]

      for (const media of validatedMedia) {
        const extension = mediaTypes[media.type].get(media.mime)
        await writeFile(path.join(directory, `${media.id}.${extension}`), media.contents, { flag: 'w' })
        const record = {
          id: media.id,
          name: media.name,
          type: media.type,
          mime: media.mime,
        }
        const existingIndex = nextLibrary.findIndex((entry) => entry.id === media.id)
        if (existingIndex < 0) nextLibrary.push(record)
        else nextLibrary[existingIndex] = record
      }

      await writeLibrary(nextLibrary)
      return mediaItems.map(({ id, name, type, src }) => ({ id, name, type, src }))
    },
  }
}

module.exports = { createMediaStore }

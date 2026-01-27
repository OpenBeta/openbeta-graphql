import { resolveAreaFileName, resolveAreaSubPath } from './area.resolver'
import path from 'path'

describe('area resolvers', () => {
  describe('area name resolver', () => {
    const testCases = [
      { name: 'should trim whitespace', input: ' test ', expected: 'test' },
      { name: 'should lowercase', input: 'TEST', expected: 'test' },
      { name: 'should replace spaces with underscores', input: 'test test', expected: 'test_test' },
      { name: 'should replace special characters', input: 'test!@#$%^&*()_+{}:"<>?[]\';,./', expected: 'test' },
      {
        name: 'should replace multiple spaces with single underscore',
        input: '   test  test       ',
        expected: 'test_test'
      },
      { name: 'should return unknown for undefined', input: undefined, expected: 'unknown' },
      { name: 'should return unknown for empty string', input: '', expected: 'unknown' },
      { name: 'should return unknown for whitespace', input: ' ', expected: 'unknown' },
      {
        name: 'acceptance test',
        input: '(Home Crag) Boulders  a.k.a. Sherriff Boulders 12',
        expected: 'home_crag_boulders_aka_sherriff_boulders_12'
      }
    ]

    function assertNameResolver (areaName: string | undefined, expected: string) {
      expect(resolveAreaFileName({ area_name: areaName })).toBe(expected)
    }

    testCases.forEach(testCase => {
      it(testCase.name, () => {
        assertNameResolver(testCase.input, testCase.expected)
      })
    })
  })

  describe('area sub path resolver', () => {
    const testCases = [
      { name: 'should return current path for empty array', input: [], expected: '.' },
      { name: 'should return path for single element', input: ['test'], expected: 'test' },
      { name: 'should return path for multiple elements', input: ['test', 'test2'], expected: path.join('test', 'test2') },
      { name: 'should ignore slashes in names', input: ['test/', 'test2\\'], expected: path.join('test', 'test2') }
    ]

    function assertSubPathResolver (path: string[], expected: string) {
      expect(resolveAreaSubPath({ pathTokens: path })).toBe(expected)
    }

    testCases.forEach(testCase => {
      it(testCase.name, () => {
        assertSubPathResolver(testCase.input, testCase.expected)
      })
    })
  })
})
